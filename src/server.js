console.log("1. เริ่มต้นการทำงาน...");

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ IMPORT ROUTES
import analysisRoutes from './routes/analysis.js';

console.log("2. Import ไลบรารีสำเร็จ...");

const app = express();

// -------------------------------------------------------------
// PORT (Render ใช้ process.env.PORT)
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------
// Middleware
// -------------------------------------------------------------
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Static files (frontend)
// -------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ storage: multer.memoryStorage() });

// -------------------------------------------------------------
// ✅ MOUNT ANALYSIS ROUTE (ตัวที่หน้าเว็บเรียก)
// -------------------------------------------------------------
app.use('/api/analysis', analysisRoutes);

// -------------------------------------------------------------
// Status check
// -------------------------------------------------------------
app.get('/status', (req, res) => {
    res.send('✅ Node.js Server (Ready for Cloud) ทำงานอยู่!');
});

// -------------------------------------------------------------
// Bridge → Python (สำหรับกรณีมีรูป)
// -------------------------------------------------------------
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

        const pythonUrl =
            process.env.PYTHON_API_URL || 'http://127.0.0.1:5001/api/analyze';

        console.log(`🚀 ส่งข้อมูลไป Python ที่: ${pythonUrl}`);

        const response = await axios.post(pythonUrl, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        console.log("✅ Python ตอบกลับมาแล้ว");
        res.json(response.data);

    } catch (error) {
        console.error("❌ ติดต่อ Python ไม่ได้ / เกิดข้อผิดพลาด");

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: "เชื่อมต่อ Python Server ไม่ได้"
            });
        }
    }
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
app.listen(PORT, () => {
    console.log("---------------------------------------------------");
    console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
    console.log("---------------------------------------------------");
});
