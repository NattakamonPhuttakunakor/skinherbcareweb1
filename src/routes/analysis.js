import express from 'express';
const router = express.Router();

// ✅ 1. วิเคราะห์อาการ (ส่งไป Python)
export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
            return res.status(400).json({ success: false, message: "กรุณาระบุอาการ" });
        }

        console.log(`📤 Node กำลังส่งไป Python: "${symptoms}"`);

        // ดึงค่าจาก Environment Variables
        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = String(process.env.API_KEY || '').trim(); 

        const response = await fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey 
            },
            body: JSON.stringify({ 
                symptoms: symptoms.trim() 
            }),
            signal: AbortSignal.timeout(30000) // 🕒 30 วินาที
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error("API Key ไม่ถูกต้อง (Unauthorized)");
            throw new Error(`Python API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับสำเร็จ");

        res.json({
            success: true,
            found: data.ok || true,
            result: data.prediction || data.result || "วิเคราะห์สำเร็จ",
            confidence: data.confidence || 0,
            recommendation: data.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม",
            prediction: data.prediction,
            data: data.data || []
        });

    } catch (error) {
        console.error("❌ Node Error:", error.message);
        
        let statusCode = 500;
        let errMsg = error.message;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            statusCode = 504;
            errMsg = "AI Server ตอบสนองช้าเกินไป (กำลังปลุก Server...)";
        } else if (error.message.includes('Unauthorized')) {
            statusCode = 401;
        }

        res.status(statusCode).json({ 
            success: false,
            message: errMsg, 
            error: error.message 
        });
    }
};

// ✅ 2. ฟังก์ชันเสริมอื่นๆ
export const getSalesData = async (req, res) => res.json({ success: true, message: "Sales data" });
export const getCategoryData = async (req, res) => res.json({ success: true, message: "Category data" });

// ✅ 3. ผูก Route เข้ากับฟังก์ชัน (เพื่อให้เรียกใช้ผ่าน URL ได้)
router.post('/analyze', diagnoseSymptoms);
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);

// ⚠️ หัวใจสำคัญ: แก้ SyntaxError ด้วยบรรทัดนี้!
export default router;