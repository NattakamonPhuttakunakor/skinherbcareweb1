console.log("1. เริ่มต้นการทำงาน...");

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';

console.log("2. Import ไลบรารีสำเร็จ...");

const app = express();

// -------------------------------------------------------------
// 🔥 จุดแก้ที่ 1: เรื่อง PORT
// บน Cloud เขาจะสุ่ม Port ให้เรา เราบังคับ 5000 ไม่ได้
// โค้ดนี้แปลว่า "ถ้า Server ให้ Port มาก็ใช้ (process.env.PORT) ถ้าไม่มีค่อยใช้ 5000"
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// บอกให้ Node.js เปิดไฟล์หน้าเว็บจากโฟลเดอร์ 'public'
// ใช้ path.join เพื่อความชัวร์เวลาขึ้น Server
app.use(express.static(path.join(__dirname, '../public'))); 

const upload = multer({ storage: multer.memoryStorage() });

// --- Route เช็คสถานะ ---
app.get('/status', (req, res) => {
    res.send('✅ Node.js Server (Ready for Cloud) ทำงานอยู่!');
});

app.post('/api/bridge/analyze', upload.single('image'), async (req, res) => {
    console.log("📩 Node ได้รับ Request จากหน้าเว็บ");

    try {
        const formData = new FormData();

        if (req.file) {
            console.log(`📸 พบรูปภาพ: ${req.file.originalname}`);
            formData.append('file', req.file.buffer, req.file.originalname);
        }

        if (req.body) {
            Object.keys(req.body).forEach(key => {
                formData.append(key, req.body[key]);
            });
        }

        // -------------------------------------------------------------
        // 🔥 จุดแก้ที่ 2: ที่อยู่ของ Python
        // บนเว็บจริง Node กับ Python อยู่คนละที่แน่นอน (ไม่ใช่ 127.0.0.1)
        // เราต้องเตรียมตัวแปร PYTHON_API_URL ไว้ใส่ลิงก์ Python ของจริงทีหลัง
        // -------------------------------------------------------------
        const pythonUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:5001/api/analyze';
        
        console.log(`🚀 กำลังส่งข้อมูลไปหา Python ที่: ${pythonUrl}`);

        const response = await axios.post(pythonUrl, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log("✅ Python ตอบกลับมาแล้ว");
        res.json(response.data);

    } catch (error) {
        console.error("❌ ติดต่อ Python ไม่ได้ / เกิดข้อผิดพลาด:");
        
        // เพิ่มการ Log ให้ละเอียดขึ้นสำหรับ Server จริง
        if (error.code === 'ECONNREFUSED') {
             console.error(`   สาเหตุ: เชื่อมต่อ ${process.env.PYTHON_API_URL || '127.0.0.1:5001'} ไม่ได้`);
        }

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ success: false, message: "เชื่อมต่อ Python Server ไม่ได้" });
        }
    }
});

// --- Start Server ---
try {
    app.listen(PORT, () => {
        console.log("---------------------------------------------------");
        console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
        console.log("   (โหมดพร้อมขึ้น Cloud + รองรับ Python URL)");
        console.log("---------------------------------------------------");
    });
} catch (err) {
    console.error("❌ เกิดข้อผิดพลาดตอน Start:", err);
}