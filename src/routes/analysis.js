import express from 'express';
import {
  getSalesData,
  getCategoryData,
  diagnoseSymptoms
} from '../controllers/analysisController.js';

const router = express.Router();

// ❌ ลบตัวแปรที่ไม่ได้ใช้ออก (API_KEY ควรไปอยู่ในไฟล์ Controller ครับ)

// --- ADMIN Routes ---
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);

// --- USER Routes ---
// 🚩 จุดสำคัญ: ชื่อ Route คือ "/diagnose"
// ดังนั้น URL เต็มๆ คือ: https://skinherbcareweb1.onrender.com/api/analysis/diagnose
router.post('/diagnose', diagnoseSymptoms);

export default router;