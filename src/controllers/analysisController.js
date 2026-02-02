// Node v20+ มี fetch ให้แล้ว ไม่ต้อง import

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // 1. Validate input
        if (!symptoms || typeof symptoms !== "string" || !symptoms.trim()) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุอาการ"
            });
        }

        // เพิ่มการตรวจสอบความยาวขั้นต่ำเพื่อป้องกัน 422 จาก AI Server
        if (symptoms.trim().length < 3) {
            return res.status(422).json({
                success: false,
                message: "กรุณาระบุรายละเอียดเพิ่มเติม (อย่างน้อย 3 ตัวอักษร)"
            });
        }

        // 2. Resolve Python service URL and key (tolerant, check both API_KEY and PYTHON_API_KEY)
        let pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:5001/predict';
        // Check API_KEY first (as set on Render), fallback to PYTHON_API_KEY
        const apiKey = (process.env.API_KEY || process.env.PYTHON_API_KEY)?.trim();

        if (!process.env.PYTHON_API_URL || !apiKey) {
            const missingParts = [];
            if (!process.env.PYTHON_API_URL) missingParts.push('PYTHON_API_URL (using fallback http://127.0.0.1:5001/predict)');
            if (!apiKey) missingParts.push('API_KEY or PYTHON_API_KEY (not set — will call Python without X-API-Key if allowed)');
            console.warn('⚠️ Partial/missing Python config:', missingParts.join(', '));
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        if (apiKey) console.log("🔑 PYTHON_API_KEY:", apiKey.slice(0, 4) + "***");

        // 3. Call Python API (send X-API-Key header only if configured)
        let response;
        try {
            const headers = { "Content-Type": "application/json" };
            if (apiKey) headers['X-API-Key'] = apiKey;

            response = await fetch(pythonApiUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({ symptoms: symptoms.trim() }),
                signal: AbortSignal.timeout(30000) // 30s
            });
        } catch (err) {
            console.warn('⚠️ Unable to reach Python service:', err.message);
            // Fall back to server-side keyword heuristic (non-demo; server returns real response)
            const fallback = serverSideHeuristic(symptoms);
            return res.json({ success: true, found: true, data: [fallback], message: 'Fallback analysis (server-side heuristic)' });
        }

        // 4. Handle Python error or non-OK responses
        if (response.status === 401) {
            // If we have a configured API key, retry without it (some Python deployments don't enforce X-API-Key)
            if (apiKey) {
                console.warn('🔐 Python returned 401 with key; retrying without X-API-Key...');
                try {
                    response = await fetch(pythonApiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ symptoms: symptoms.trim() }),
                        signal: AbortSignal.timeout(30000)
                    });
                } catch (err) {
                    console.warn('⚠️ Retry without API key failed:', err.message);
                    const fallback = serverSideHeuristic(symptoms);
                    return res.json({ success: true, found: true, data: [fallback], message: 'Fallback analysis (server-side heuristic)' });
                }
            } else {
                console.error('❌ Python requires API Key but server has none.');
                return res.status(500).json({ success: false, message: 'Server configuration missing: PYTHON_API_KEY. Set it in your hosting environment.' });
            }
        }

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('❌ Python returned error:', response.status, text);
            // Try fallback server-side heuristic
            const fallback = serverSideHeuristic(symptoms);
            return res.json({ success: true, found: true, data: [fallback], message: 'Fallback analysis (server-side heuristic due to Python error)' });
        }

        const data = await response.json().catch(() => null);
        console.log("✅ Python response:", data);

        // 5. Normalize Python response and return
        if (data && (data.prediction || data.data)) {
            // If Python returns a single prediction object
            if (data.prediction) {
                const out = {
                    disease: data.prediction,
                    confidence: data.confidence ?? 0,
                    treatment: data.recommendation || data.treatment || data.message || ''
                };
                return res.json({ success: true, found: true, data: [out], message: data.message || 'วิเคราะห์สำเร็จ' });
            }

            // If Python returns structured data
            return res.json({ success: true, found: data.found ?? false, data: data.data ?? [], message: data.message ?? 'วิเคราะห์สำเร็จ' });
        }

        // If Python returned nothing useful, fallback
        const fallback = serverSideHeuristic(symptoms);
        return res.json({ success: true, found: true, data: [fallback], message: 'Fallback analysis (server-side heuristic)' });

        // --------------------------
        // server-side simple heuristic
        function serverSideHeuristic(text) {
            const t = (text || '').toLowerCase();
            if (t.includes('สิว') || t.includes('acne')) {
                return { disease: 'สิวอักเสบ (Acne)', confidence: 70, recommendation: 'แนะนำสมุนไพร: ว่านหางจระเข้, แตงกวา' };
            }
            if (t.includes('แห้ง') || t.includes('ผิวแห้ง') || t.includes('dry')) {
                return { disease: 'ผิวแห้ง (Dry skin)', confidence: 65, recommendation: 'แนะนำสมุนไพร: มะพร้าว, ว่านหางจระเข้' };
            }
            if (t.includes('คัน') || t.includes('ผื่น') || t.includes('itch')) {
                return { disease: 'ผื่นคัน / ผิวอักเสบ', confidence: 62, recommendation: 'แนะนำสมุนไพร: ใบบัวบก, ดอกทองพันชั่ง' };
            }
            if (t.includes('แดง') || t.includes('อักเสบ')) {
                return { disease: 'การอักเสบทั่วไป', confidence: 60, recommendation: 'แนะนำสมุนไพร: ว่านหางจระเข้' };
            }
            return { disease: 'ไม่แน่ใจ (ต้องการข้อมูลเพิ่มเติม)', confidence: 50, recommendation: 'ขอข้อมูลเพิ่มเพื่อการวินิจฉัยที่แม่นยำขึ้น' };
        }

    } catch (error) {
        console.error("❌ Node Error:", error.message);

        let statusCode = 500;
        if (error.name === "AbortError") statusCode = 504;
        if (error.message.includes("Unauthorized")) statusCode = 401;

        res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
};
