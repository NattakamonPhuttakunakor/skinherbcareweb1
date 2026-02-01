console.log("1. เริ่มต้นการทำงาน...");

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';       // ตัวช่วยรับรูปภาพ
import FormData from 'form-data';  // ตัวช่วยห่อข้อมูลส่ง Python
import path from 'path';           // ช่วยระบุตำแหน่งโฟลเดอร์
import { fileURLToPath } from 'url'; // สำหรับแก้เรื่อง path ใน ES Module

console.log("2. Import ไลบรารีสำเร็จ...");

const app = express();
const PORT = 5000;

// แก้ไขเรื่อง Path ให้ Node รู้จักโฟลเดอร์ปัจจุบัน
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// บอกให้ Node.js เปิดไฟล์หน้าเว็บจากโฟลเดอร์ 'public'
app.use(express.static('public')); 

// ตั้งค่า Multer (เก็บไฟล์ใน RAM ชั่วคราว เพื่อส่งต่อทันที)
const upload = multer({ storage: multer.memoryStorage() });

// --- Route เช็คสถานะ ---
app.get('/status', (req, res) => {
    res.send('✅ Node.js Server (รองรับรูปภาพ) ทำงานอยู่!');
});

// 👇👇👇 แก้ไขตรงนี้ครับ (เปลี่ยนชื่อ Route ให้ตรงกับหน้าเว็บ) 👇👇👇
app.post('/api/bridge/analyze', upload.single('image'), async (req, res) => {
    console.log("📩 Node ได้รับ Request จากหน้าเว็บ");

    try {
        const formData = new FormData();

        // 1. ถ้ามีไฟล์รูปแนบมา ให้เอาใส่กล่อง formData
        if (req.file) {
            console.log(`📸 พบรูปภาพ: ${req.file.originalname}`);
            formData.append('file', req.file.buffer, req.file.originalname);
        } else {
            console.log("⚠️ ไม่พบรูปภาพ (Request นี้อาจมีแค่ข้อความ)");
        }

        // 2. ถ้ามีข้อความอื่นๆ (เช่น symptoms) แนบมาด้วย
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                formData.append(key, req.body[key]);
            });
        }

        // 3. ส่งต่อไป Python (Port 5001)
        console.log("🚀 กำลังส่งข้อมูลไปหา Python...");
        // ใช้ 127.0.0.1 ตามที่เราตกลงกันไว้
        const pythonUrl = 'http://127.0.0.1:5001/api/analyze';
        
        const response = await axios.post(pythonUrl, formData, {
            headers: {
                ...formData.getHeaders() // สำคัญ! ต้องใส่ Header ให้ถูกรูปแบบไฟล์
            }
        });

        console.log("✅ Python ตอบกลับมาแล้ว");
        res.json(response.data);

    } catch (error) {
        console.error("❌ ติดต่อ Python ไม่ได้ / เกิดข้อผิดพลาด:");
        if (error.response) {
            // กรณี Python ตอบ Error กลับมา
            console.error("   Status:", error.response.status);
            console.error("   Data:", error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            // กรณีต่อ Python ไม่ติดเลย
            console.error("   Message:", error.message);
            res.status(500).json({ success: false, message: "เชื่อมต่อ Python Server ไม่ได้ (เปิด Port 5001 หรือยัง?)" });
        }
    }
});

// --- สั่งให้ Server รอรับ request ---
try {
    console.log("3. กำลังจะเปิด Port...");
    app.listen(PORT, () => {
        console.log("---------------------------------------------------");
        console.log(`🚀 SERVER RUNNING ON: http://localhost:${PORT}`);
        console.log("   (โหมดรองรับรูปภาพ + เชื่อมต่อ Python)");
        console.log("---------------------------------------------------");
    });
} catch (err) {
    console.error("❌ เกิดข้อผิดพลาดตอน Start:", err);
}