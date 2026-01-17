import express from 'express';
import { suggestHerbs, analyzeDiseaseImage, analyzeHerbImage } from '../controllers/geminiController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Route for analyzing text-based symptoms
router.post('/suggest-herbs', suggestHerbs);

// Route for analyzing skin disease images
router.post('/analyze-disease-image', upload.single('image'), analyzeDiseaseImage);

// Route for analyzing herb images
router.post('/analyze-herb-image', upload.single('image'), analyzeHerbImage);

export default router;

