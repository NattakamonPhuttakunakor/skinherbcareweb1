import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Router: /api/analysis/analyze
router.post('/analyze', upload.single('image'), async (req, res) => {
    console.log("-------------------------------------------------");
    console.log("📩 Node: ได้รับคำสั่งวิเคราะห์จากหน้าเว็บ");
    
    // 1. ตรวจสอบว่ามี Link Python หรือยัง?
    const pythonUrl = process.env.PYTHON_API_URL;
    if (!pythonUrl) {
        console.error("❌ Node Error: ไม่พบตัวแปร PYTHON_API_URL ใน Environment");
        return res.status(500).json({ success: false, message: "Server Config Error: Missing Python URL" });
    }

    try {
        // 2. เตรียมข้อมูลจะส่งไป Python
        const formData = new FormData();
        
        // ใส่ข้อความอาการ
        const symptoms = req.body.symptoms || "";
        formData.append('symptoms', symptoms);
        console.log(`📝 อาการที่ส่งไป: "${symptoms}"`);

        // ใส่รูปภาพ (ถ้ามี)
        if (req.file) {
            console.log(`📸 มีรูปภาพแนบมา: ${req.file.originalname}`);
            formData.append('file', req.file.buffer, req.file.originalname);
        }

        // 3. ยิงไปหา Python (ช่วงลุ้นระทึก)
        console.log(`🚀 กำลังเชื่อมต่อไปยัง Python ที่: ${pythonUrl}`);
        
        const response = await axios.post(pythonUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                // 'x-api-key': '123456' // เปิดบรรทัดนี้ถ้า Python เปิดเช็ก Key
            },
            timeout: 60000 // รอ Python ตื่นสูงสุด 60 วินาที (กัน Timeout เร็วไป)
        });

        // 4. ถ้า Python ตอบกลับมา
        console.log("✅ Python ตอบกลับสำเร็จ:", response.data);
        res.json(response.data);

    } catch (error) {
        // 5. จุดดักจับความผิดพลาด (ไม่ให้ขึ้น 500 แบบงงๆ)
        console.error("❌ Node Crash Error:", error.message);

        if (error.response) {
            // Python ตอบกลับมาเป็น Error (404, 500)
            console.error("📌 Python Response Data:", error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            // Python ปิดอยู่ หรือ Link ผิด
            console.error("📌 สาเหตุ: เชื่อมต่อ Python ไม่ได้ (Server อาจจะดับ หรือ Link ผิด)");
            res.status(503).json({ success: false, message: "AI Service Unavailable (Connection Refused)" });
        } else {
            // อื่นๆ
            res.status(500).json({ 
                success: false, 
                message: "Internal Bridge Error", 
                error: error.message 
            });
        }
    }
});

export default router;