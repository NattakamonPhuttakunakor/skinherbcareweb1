import express from 'express';
const router = express.Router();

// ✅ 1. วิเคราะห์อาการ (ส่งไป Python)
export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // Validate input
        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
            return res.status(400).json({ 
                success: false, 
                message: "กรุณาระบุอาการ" 
            });
        }

        // ✅ เช็ค Environment Variables (ห้าม fallback)
        const pythonApiUrl = process.env.PYTHON_API_URL?.trim();
        const apiKey = process.env.API_KEY?.trim();

        if (!pythonApiUrl || !apiKey) {
            console.error("❌ ENV ขาด PYTHON_API_URL หรือ API_KEY");
            console.error("PYTHON_API_URL:", pythonApiUrl);
            console.error("API_KEY exists:", !!apiKey);
            
            return res.status(500).json({
                success: false,
                message: "Server configuration error - กรุณาติดต่อผู้ดูแลระบบ"
            });
        }

        console.log("📤 Node → Python:", pythonApiUrl);
        console.log("🔑 Node API Key:", apiKey.slice(0, 4) + "***");
        console.log("💬 Symptoms:", symptoms.trim());

        // ✅ Call Python API
        const response = await fetch(pythonApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey
            },
            body: JSON.stringify({
                symptoms: symptoms.trim()
            }),
            signal: AbortSignal.timeout(30000) // 30 วินาที
        });

        console.log("📥 Python Response Status:", response.status);

        // ✅ จัดการ Error Codes
        if (response.status === 401) {
            console.error("❌ Python แจ้งว่า API Key ไม่ถูกต้อง!");
            throw new Error("Unauthorized: API Key ไม่ถูกต้อง");
        }

        if (response.status === 400) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Python รับข้อมูลไม่ถูกต้อง");
        }

        if (!response.ok) {
            const text = await response.text();
            console.error("❌ Python Error Response:", text);
            throw new Error(`Python API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับสำเร็จ:", JSON.stringify(data, null, 2));

        // ✅ ส่งกลับไปหน้าบ้าน
        res.json({
            success: true,
            found: data.ok !== undefined ? data.ok : true,
            result: data.prediction || data.result || "วิเคราะห์สำเร็จ",
            confidence: data.confidence || 0,
            recommendation: data.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม",
            prediction: data.prediction,
            data: data.data || []
        });

    } catch (error) {
        console.error("❌ Node Error Details:", error.message);
        console.error("Stack:", error.stack);
        
        let statusCode = 500;
        let errMsg = error.message;

        // ✅ จัดการ Error ต่างๆ
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            statusCode = 504;
            errMsg = "AI Server ตอบสนองช้า (Timeout) - กรุณาลองใหม่อีกครั้ง";
        } else if (error.message.includes('Unauthorized')) {
            statusCode = 401;
            errMsg = "ระบบรักษาความปลอดภัยปฏิเสธการเข้าถึง (กรุณาติดต่อผู้ดูแลระบบ)";
        } else if (error.message.includes('fetch failed') || error.code === 'ECONNREFUSED') {
            statusCode = 503;
            errMsg = "ไม่สามารถเชื่อมต่อ AI Server - กรุณาลองใหม่ภายหลัง";
        }

        res.status(statusCode).json({ 
            success: false,  // ✅ แก้จาก False
            message: errMsg,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ✅ 2. ฟังก์ชันเสริมอื่นๆ
export const getSalesData = async (req, res) => {
    res.json({ 
        success: true, 
        message: "Sales data endpoint",
        data: [] 
    });
};

export const getCategoryData = async (req, res) => {
    res.json({ 
        success: true, 
        message: "Category data endpoint",
        data: [] 
    });
};

// ✅ 3. ผูก Route เข้ากับฟังก์ชัน
router.post('/analyze', diagnoseSymptoms);
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);

// ✅ ต้องมี export default
export default router;