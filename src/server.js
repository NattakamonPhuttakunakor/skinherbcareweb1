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
// 🔑 กู้คืน Auth Routes (ถ้าพี่ใช้ชื่อไฟล์อื่น เช่น login.js ให้เปลี่ยนชื่อตรงนี้ครับ)
import authRoutes from './routes/auth.js'; 

console.log("2. Import ไลบรารีสำเร็จ...");

const app = express();

const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------
// Middleware
// -------------------------------------------------------------
app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// ✅ MOUNT ROUTES (หัวใจสำคัญที่ทำให้ Login กลับมา)
// -------------------------------------------------------------
// 1. เส้นทางสำหรับ Login/Register
app.use('/api/auth', authRoutes); 

// 2. เส้นทางสำหรับวิเคราะห์อาการ (ที่คุยกับ Python)
app.use('/api/analysis', analysisRoutes);

// -------------------------------------------------------------
// Static files (frontend)
// -------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ storage: multer.memoryStorage() });

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
    try {
        const formData = new FormData();
        if (req.file) {
            formData.append('file', req.file.buffer, req.file.originalname);
        }
        if (req.body) {
            Object.keys(req.body).forEach(key => {
                formData.append(key, req.body[key]);
            });
        }

        const pythonUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = (process.env.API_KEY || '123456').strip();

        const response = await axios.post(pythonUrl, formData, {
            headers: {
                ...formData.getHeaders(),
                'x-api-key': apiKey
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("❌ Bridge Error:", error.message);
        res.status(500).json({ success: False, message: "เชื่อมต่อ AI Server ไม่ได้" });
    }
});

app.listen(PORT, () => {
    console.log("---------------------------------------------------");
    console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
    console.log("---------------------------------------------------");
});