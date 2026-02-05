import express from 'express';
import multer from 'multer';
import { analyzeWithPython, debugPythonUpload } from '../controllers/pythonController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/python/predict
router.post('/predict', upload.single('image'), analyzeWithPython);
// POST /api/python/debug
router.post('/debug', upload.single('image'), debugPythonUpload);

export default router;
