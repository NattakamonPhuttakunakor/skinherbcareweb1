console.log("1. เริ่มต้นการทำงาน...");

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose'; // ✅ เพิ่มสำหรับเชื่อมต่อ MongoDB

// ✅ IMPORT ROUTES
import analysisRoutes from './routes/analysis.js';
import authRoutes from './routes/auth.js'; 
import herbRoutes from './routes/herbs.js';
import diseaseRoutes from './routes/diseases.js';
import geminiRoutes from './routes/gemini.js';
import pythonRoutes from './routes/python.js';

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
// ✅ เชื่อมต่อ MongoDB (แก้ปัญหา Login Timeout)
// -------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

// If running in production we must have these envs set
if (process.env.NODE_ENV === 'production') {
    const missing = [];
    if (!MONGODB_URI) missing.push('MONGODB_URI');
    if (!process.env.PYTHON_API_URL) missing.push('PYTHON_API_URL');
    if (!process.env.PYTHON_API_KEY) missing.push('PYTHON_API_KEY');
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables for production:', missing.join(', '));
        console.error('💡 Fix: Set these in your hosting provider (e.g. Render) before enabling production. Example: JWT_SECRET=<your-secret>, PYTHON_API_KEY=fp_yolo_2026_secret_x93k');
        console.error('⚠️ Continuing startup in degraded mode: endpoints that require the missing envs will return 500/401 until fixed.');
        // Do NOT exit the process here to allow the service to start (useful for inspecting logs on providers like Render).
        // The server will still return configuration errors for endpoints that require these env vars.
        global.MISSING_PROD_ENVS = missing; // expose for health checks
    }
}

if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI ไม่ได้ตั้งค่า — รันในโหมด no-db (จะยังให้ endpoints ทำงานเพื่อทดสอบ)');
} else {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // ✅ เพิ่ม timeout
        socketTimeoutMS: 45000,
    })
    .then(() => {
        console.log('✅ MongoDB Connected Successfully');
        console.log('📍 Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('💡 ตรวจสอบ:');
        console.error('   1. MONGODB_URI ถูกต้องหรือไม่');
        console.error('   2. MongoDB Atlas IP Whitelist');
        console.error('   3. Username/Password ถูกต้อง');
        // ไม่ exit เพื่อให้ dev สามารถทดสอบฟังก์ชันอื่นได้
    });
}

// เช็คสถานะการเชื่อมต่อ
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB Disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Runtime Error:', err.message);
});

// -------------------------------------------------------------
// ✅ MOUNT ROUTES
// -------------------------------------------------------------
app.use('/api/auth', authRoutes); 
app.use('/api/analysis', analysisRoutes);
app.use('/api/herbs', herbRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/python', pythonRoutes);

// -------------------------------------------------------------
// Skin disease proxy (avoid CORS by calling from server)
// -------------------------------------------------------------
app.post('/api/skin/predict', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided.' });
        }

        const skinUrl = process.env.SKIN_API_URL || 'https://b37b065bacf4.ngrok-free.app/predict';
        const skinKey = (process.env.SKIN_API_KEY || 'skin-func-66xe25').trim();

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname || 'upload.jpg',
            contentType: req.file.mimetype || 'image/jpeg'
        });

        const headers = { ...formData.getHeaders() };
        if (skinKey) headers['X-API-Key'] = skinKey;
        headers['ngrok-skip-browser-warning'] = '69420';

        const response = await axios.post(skinUrl, formData, {
            headers,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 60000
        });

        res.json(response.data);
    } catch (error) {
        console.error('Skin API proxy error:', error.message);
        const status = error.response?.status || 500;
        res.status(status).json({
            success: false,
            message: 'Skin API request failed',
            error: error.message,
            details: error.response?.data
        });
    }
});

// -------------------------------------------------------------
// Static files (frontend)
// -------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ storage: multer.memoryStorage() });

// -------------------------------------------------------------
// Status check
// -------------------------------------------------------------
app.get('/status', async (req, res) => {
    const pythonUrl = process.env.PYTHON_API_URL;

    const status = {
        status: '✅ Server Running',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        port: PORT,
        timestamp: new Date().toISOString(),
        python: { reachable: false },
        missing_envs: global.MISSING_PROD_ENVS || []
    };

    if (pythonUrl) {
        try {
            const r = await fetch(pythonUrl.replace(/\/predict\/?$/, '/') );
            if (r.ok) {
                const j = await r.json().catch(() => null);
                status.python = { reachable: true, info: j };
            } else {
                status.python = { reachable: false, status: r.status };
            }
        } catch (err) {
            status.python = { reachable: false, error: err.message };
        }
    } else {
        status.python = { reachable: false, error: 'PYTHON_API_URL not configured' };
    }

    res.json(status);
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
        // Check API_KEY first (as set on Render), fallback to PYTHON_API_KEY
        const apiKey = (process.env.API_KEY || process.env.PYTHON_API_KEY)?.trim();

        console.log('📤 Bridge → Python:', pythonUrl);
        console.log('🔑 API Key (configured):', apiKey ? (apiKey.slice(0, 4) + '***') : '(not set)');

        const headers = { ...formData.getHeaders() };
        if (apiKey) headers['X-API-Key'] = apiKey;

        const response = await axios.post(pythonUrl, formData, {
            headers,
            timeout: 30000 // 30 วินาที
        });

        res.json(response.data);
    } catch (error) {
        console.error("❌ Bridge Error:", error.message);
        
        let statusCode = 500;
        let message = "เชื่อมต่อ AI Server ไม่ได้";
        
        if (error.code === 'ECONNREFUSED') {
            message = "ไม่สามารถเชื่อมต่อ Python Server";
        } else if (error.code === 'ETIMEDOUT') {
            statusCode = 504;
            message = "Python Server ตอบช้า (Timeout)";
        } else if (error.response?.status === 401) {
            statusCode = 401;
            message = "API Key ไม่ถูกต้อง";
        }
        
        res.status(statusCode).json({ 
            success: false,  // ✅ แก้จาก False
            message: message,
            error: error.message
        });
    }
});

// -------------------------------------------------------------
// ✅ Error Handling Middleware
// -------------------------------------------------------------
app.use((err, req, res, next) => {
    console.error('💥 Unhandled Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// -------------------------------------------------------------
// Start Server
// -------------------------------------------------------------
app.listen(PORT, () => {
    console.log("===================================================");
    console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⏳ Connecting...'}`);
    console.log("===================================================");
});

// -------------------------------------------------------------
// Graceful Shutdown
// -------------------------------------------------------------
process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
