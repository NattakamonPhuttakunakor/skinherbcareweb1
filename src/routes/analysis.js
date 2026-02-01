import express from 'express';
import {
  getSalesData,
  getCategoryData,
  diagnoseSymptoms
} from '../controllers/analysisController.js';

const router = express.Router();

// --- Routes ---
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);
router.post('/diagnose', diagnoseSymptoms);
router.post('/analyze', diagnoseSymptoms);

// ✅ สำคัญที่สุด
export default router;
