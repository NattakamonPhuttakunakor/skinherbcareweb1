import express from 'express';
import {
  getSalesData,
  getCategoryData,
  diagnoseSymptoms
} from '../controllers/analysisController.js';

const router = express.Router();
const API_URL = process.env.PREDICT_API_URL;
const API_KEY = process.env.API_KEY;

// ADMIN
router.get('/sales', getSalesData);
router.get('/categories', getCategoryData);

// USER
router.post('/diagnose', diagnoseSymptoms);

export default router;