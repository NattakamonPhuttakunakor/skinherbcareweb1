import express from 'express';
const router = express.Router();

// ✅ 1. วิเคราะห์อาการ (ส่งไป Python)
export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
            return res.status(400).json({ success: false, message: "กรุณาระบุอาการ" });
        }

        // 🔍 Debug: ดูค่าที่ดึงมาจาก Render (ดูได้ที่หน้า Logs ของ Render)
        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = (process.env.API_KEY || '123456').trim(); // ถ้าลืมตั้งใน Render จะใช้ 123456 เป็นค่าเริ่มต้น

        console.log(`📤 Node กำลังส่งไป: ${pythonApiUrl}`);
        console.log(`🔑 ใช้ API Key: ${apiKey.substring(0, 2)}***`); // แสดงแค่ 2 ตัวแรกเพื่อความปลอดภัย

        const response = await fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // หัวใจสำคัญ: ตัวพิมพ์ใหญ่-เล็กต้องตรงกับฝั่ง Python
            },
            body: JSON.stringify({ 
                symptoms: symptoms.trim() 
            }),
            signal: AbortSignal.timeout(30000) // 🕒 30 วินาที
        });

        // 🚫 ถ้า Python ตอบกลับว่า Unauthorized (401)
        if (response.status === 401) {
            console.error("❌ Python แจ้งว่า API Key ไม่ถูกต้อง!");
            throw new Error("API Key ไม่ถูกต้อง (Unauthorized)");
        }

        if (!response.ok) {
            throw new Error(`Python API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับสำเร็จ:", data.prediction || "พบข้อมูล");

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
        console.error("❌ Node Error Details:", error.message);
        
        let statusCode = 500;
        let errMsg = error.message;

        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            statusCode = 504;
            errMsg = "AI Server ตอบสนองช้า (Timeout)";
        } else if (error.message.includes('Unauthorized')) {
            statusCode = 401;
            errMsg = "ระบบรักษาความปลอดภัยปฏิเสธการเข้าถึง (Key ผิด)";
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

// ✅ 3. ผูก Route เข้ากับฟังก์ชัน
router.post('/analyze', diagnoseSymptoms);
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);

// ⚠️ หัวใจสำคัญ: ห้ามลบบรรทัดนี้!
export default router;