import express from 'express';
import axios from 'axios';

const router = express.Router();

// ✅ วิเคราะห์อาการ (ส่งไป Python)
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

        // 2. ENV
        const pythonApiUrl = process.env.PYTHON_API_URL?.trim();
        const apiKey = process.env.API_KEY?.trim();

        if (!pythonApiUrl) {
            console.error("❌ PYTHON_API_URL ไม่ถูกตั้งค่า");
            return res.status(500).json({
                success: false,
                message: "Server config error (PYTHON_API_URL)"
            });
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        console.log("💬 Symptoms:", symptoms.trim());

        // 3. Call Python API (ใช้ axios)
        const response = await axios.post(
            pythonApiUrl,
            { symptoms: symptoms.trim() },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey || "123456" // กันพัง
                },
                timeout: 30000
            }
        );

        console.log("📥 Python Response:", response.data);

        // 4. ส่งกลับ Frontend
        res.json({
            success: true,
            prediction: response.data.prediction || "ไม่พบผลลัพธ์",
            confidence: response.data.confidence || 0,
            treatment: response.data.treatment || "-",
            herbs: response.data.herbs || []
        });

    } catch (error) {
        console.error("❌ Node Analyze Error:", error.message);

        // axios error detail
        if (error.response) {
            console.error("📛 Python Status:", error.response.status);
            console.error("📛 Python Data:", error.response.data);
        }

        res.status(500).json({
            success: false,
            message: "ไม่สามารถวิเคราะห์อาการได้ (AI Server)",
        });
    }
};

// Routes
router.post('/analyze', diagnoseSymptoms);

export default router;
