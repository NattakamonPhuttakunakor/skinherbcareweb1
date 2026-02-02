import express from "express";
import axios from "axios";

const router = express.Router();

import { diagnoseSymptoms } from '../controllers/analysisController.js';

/**
 * POST /api/analysis/analyze
 * POST /api/analysis/diagnose
 * ทั้งสอง route จะเรียก controller เดียวกัน เพื่อความเข้ากันได้ย้อนหลัง
 */
router.post('/analyze', diagnoseSymptoms);
router.post('/diagnose', diagnoseSymptoms);

export default router;
