// Node v20+ มี fetch ให้แล้ว

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // 1. Validate input
        if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
            return res.status(400).json({
                success: false,
                message: "กรุณาระบุอาการ"
            });
        }

        // 2. ENV (ห้าม fallback)
        const pythonApiUrl = process.env.PYTHON_API_URL;
        const apiKey = process.env.API_KEY?.trim();

        if (!pythonApiUrl || !apiKey) {
            console.error("❌ ENV ขาด PYTHON_API_URL หรือ API_KEY");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        console.log("🔑 Node API Key:", apiKey.slice(0, 4) + "***");

        // 3. Call Python
        const response = await fetch(pythonApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            },
            body: JSON.stringify({
                symptoms: symptoms.trim()
            }),
            signal: AbortSignal.timeout(30000)
        });

        // 4. Error from Python
        if (response.status === 401) {
            throw new Error("Unauthorized: API Key ไม่ถูกต้อง");
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Python API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับ:", data);

        // 5. Send to frontend
        res.json({
            success: true,
            result: data.prediction,
            confidence: data.confidence,
            recommendation: data.recommendation
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
