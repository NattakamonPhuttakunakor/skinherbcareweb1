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

        // 2. ENV (ต้องมีครบ ห้าม fallback)
        const pythonApiUrl = process.env.PYTHON_API_URL;
        const apiKey = process.env.PYTHON_API_KEY?.trim();

        if (!pythonApiUrl || !apiKey) {
            const missing = [];
            if (!pythonApiUrl) missing.push('PYTHON_API_URL');
            if (!apiKey) missing.push('PYTHON_API_KEY');
            console.error("❌ Missing env:", missing.join(', '));
            return res.status(500).json({
                success: false,
                message: `Server configuration error: missing ${missing.join(', ')}. Set them in your hosting environment.`
            });
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        console.log("🔑 PYTHON_API_KEY:", apiKey.slice(0, 4) + "***");

        // 3. Call Python API
        const response = await fetch(pythonApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            },
            body: JSON.stringify({
                symptoms: symptoms.trim()
            }),
            signal: AbortSignal.timeout(30000) // 30 วิ
        });

        // 4. Handle Python error (ส่งต่อ status/text ตรงๆ เพื่อให้ frontend แสดงข้อความที่ชัดเจน)
        if (response.status === 401) {
            return res.status(401).json({ success: false, message: 'Unauthorized: API Key ไม่ถูกต้อง' });
        }

        if (!response.ok) {
            const text = await response.text();
            console.error('❌ Python returned error:', response.status, text);
            // พยายาม parse เป็น JSON ถ้าเป็นได้
            try {
                const json = JSON.parse(text);
                return res.status(response.status).json({ success: false, ...json });
            } catch {
                return res.status(response.status).json({ success: false, message: text || 'Python API error' });
            }
        }

        const data = await response.json();
        console.log("✅ Python response:", data);

        // 5. ส่งกลับ frontend (ตาม format Python จริง)
        res.json({
            success: true,
            found: data.found ?? false,
            data: data.data ?? [],
            message: data.message ?? "วิเคราะห์สำเร็จ"
        });

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
