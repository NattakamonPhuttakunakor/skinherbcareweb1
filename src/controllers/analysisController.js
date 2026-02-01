// ✅ Node v20+ มี fetch ให้แล้ว ไม่ต้อง import

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // 1. Validate input
        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุอาการ"
            });
        }

        console.log(`📤 Node ส่งไป Python: "${symptoms}"`);

        // 2. Environment variables
        const pythonApiUrl =
            process.env.PYTHON_API_URL ||
            'https://finalproject-3-uprs.onrender.com/predict';

        const apiKey = process.env.API_KEY; // 123456

        // 3. Call Python API
        const response = await fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            },
            body: JSON.stringify({
                symptoms: symptoms.trim()
            }),
            signal: AbortSignal.timeout(15000)
        });

        // 4. Handle Python errors
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error("API Key ไม่ถูกต้อง (Unauthorized)");
            }
            throw new Error(`Python API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับ:", data);

        // 5. Response ให้ frontend
        res.json({
            success: true,
            found: data.ok ?? true,
            result: data.prediction || data.result || "วิเคราะห์สำเร็จ",
            confidence: data.confidence || 0,
            recommendation:
                data.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม",
            prediction: data.prediction,
            data: data.data || []
        });

    } catch (error) {
        console.error("❌ Node Error:", error.message);

        const statusCode =
            error.name === 'AbortError' ||
            error.message.includes('fetch failed')
                ? 503
                : 500;

        res.status(statusCode).json({
            success: false,
            message: "ไม่พบข้อมูลที่ชัดเจน",
            error: error.message
        });
    }
};

// --- Admin ---
export const getSalesData = async (req, res) => {
    res.json({ success: true, message: "Sales data fetched" });
};

export const getCategoryData = async (req, res) => {
    res.json({ success: true, message: "Category data fetched" });
};
