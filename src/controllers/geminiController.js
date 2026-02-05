import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import Herb from '../models/Herb.js';


const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findHerbFallback = async (file) => {
    try {
        const baseName = path.parse(file?.originalname || '').name.trim();
        if (!baseName) return null;
        const herb = await Herb.findOne({ name: new RegExp(escapeRegex(baseName), 'i') }).lean();
        if (!herb) return null;
        return {
            name: herb.name || '-',
            scientificName: herb.scientificName || '',
            benefits: herb.description || '',
            diseases: Array.isArray(herb.diseases) ? herb.diseases : [],
            confidence: 0,
            usage: herb.usage || '',
            precautions: herb.precautions || ''
        };
    } catch (error) {
        return null;
    }
};

// @desc    วิเคราะห์อาการและแนะนำสมุนไพร
export const suggestHerbs = async (req, res) => {
    const { symptoms } = req.body;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-')) {
        console.error('❌ GEMINI_API_KEY not configured on Render');
        return res.status(500).json({ 
            success: false, 
            message: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับ AI กรุณาติดต่อผู้ดูแลระบบ",
            detail: "GEMINI_API_KEY is not configured on Render environment"
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `ฉันมีอาการทางผิวหนังดังนี้: "${symptoms}" 
        ช่วยแนะนำสมุนไพรไทยที่เหมาะสมในการรักษา 2-3 ชนิด บอกสรรพคุณและวิธีใช้อย่างย่อ 
        ตอบกลับในรูปแบบ JSON format โดยมี key ชื่อ "herbs" เป็น array ของ object ที่มี field "name", "properties", "usage"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // พยายามแปลง Text เป็น JSON (บางที AI อาจส่ง Markdown backtick มาด้วย ต้อง clean ออก)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        res.json({ success: true, data: data });

    } catch (error) {
        console.error("Gemini Error:", error);
        res.status(500).json({ success: false, message: "ไม่สามารถประมวลผลได้ในขณะนี้" });
    }
};

// สำหรับ analyzeDiseaseImage และ analyzeHerbImage ต้องใช้ model: "gemini-1.5-flash" 
// และต้องแปลงไฟล์รูปภาพเป็น base64 ก่อนส่งไปหา API
export const analyzeDiseaseImage = async (req, res) => {
    console.log('------------------------------------------------');
    console.log('Disease analysis start');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image for analysis.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.includes('your-')) {
            console.error('GEMINI_API_KEY not configured');
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration missing GEMINI_API_KEY.',
                detail: 'GEMINI_API_KEY is not configured on Render environment'
            });
        }
        console.log(`GEMINI_API_KEY present (prefix: ${apiKey.slice(0, 4)}***)`);

        console.log('Disease image received', {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        const imageBuffer = req.file.buffer || fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyze this skin condition image and respond with JSON only.
Required keys: "name", "symptoms", "treatment".
Notes:
1) name: likely disease name (Thai name if possible)
2) symptoms: possible symptoms in short text
3) treatment: basic suggestion or next steps
Do not include markdown code blocks.`;

        console.log('Sending request to Gemini...');
        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType,
                },
            },
            prompt,
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini raw response (first 300 chars):', text.slice(0, 300));

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data;
        try {
            data = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            data = {
                name: 'Unable to parse response',
                symptoms: cleanedText,
                treatment: 'Please consult a dermatologist for accurate diagnosis.'
            };
        }

        if (req.file) fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting file:', err); });
        return res.json({ success: true, data: data });
    } catch (error) {
        console.error('Gemini Disease Analysis Error:', error);
        if (req.file) fs.unlink(req.file.path, (err) => {});
        let message = 'Internal Server Error during analysis.';
        if (String(error?.message || '').includes('403')) message = 'API Permission Denied. Check API Key or Quota.';
        if (String(error?.message || '').includes('429')) message = 'Too many requests. Please try again later.';
        return res.status(500).json({ success: false, message, debug_error: error.message });
    }
};


export const analyzeHerbImage = async (req, res) => {
    console.log('------------------------------------------------');
    console.log('Herb analyze start');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Image file is required.' });
        }

        console.log('Herb image received', {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey.includes('your-')) {
            console.error('GEMINI_API_KEY not configured');
            const fallback = await findHerbFallback(req.file);
            if (fallback) {
                return res.json({ success: true, data: fallback, message: 'Fallback: database match by file name.' });
            }
            return res.status(503).json({
                success: false,
                message: 'Server configuration missing GEMINI_API_KEY.'
            });
        }
        console.log(`GEMINI_API_KEY present (prefix: ${apiKey.slice(0, 4)}***)`);

        const imageBuffer = req.file.buffer || fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analyze this herb image and respond with JSON only.
Required keys: "name", "scientificName", "benefits", "diseases", "confidence", "usage", "precautions".
Notes:
1) name: herb name
2) scientificName: scientific name if known
3) benefits: skin-related benefits
4) diseases: list of skin issues it helps
5) confidence: 0-100
6) usage: suggested usage
7) precautions: cautions or contraindications`;

        console.log('Sending request to Gemini...');
        const result = await model.generateContent([
            {
                inlineData: {
                    data: base64Image,
                    mimeType: mimeType
                }
            },
            prompt
        ]);

        const response = await result.response;
        const text = response.text();
        console.log('Gemini raw response (first 300 chars):', text.slice(0, 300));

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let data;
        try {
            data = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            data = {
                name: 'Unable to parse response',
                scientificName: '',
                benefits: cleanedText,
                diseases: [],
                confidence: 0,
                usage: '',
                precautions: ''
            };
        }

        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting file:', err); });
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Gemini Herb Analysis Error:', error);
        if (req.file) fs.unlink(req.file.path, (err) => {});

        const fallback = await findHerbFallback(req.file);
        if (fallback) {
            return res.json({ success: true, data: fallback, message: 'Fallback: database match by file name.' });
        }

        let message = 'Image analysis failed.';
        if (String(error?.message || '').includes('API key')) message = 'Invalid API key.';
        if (String(error?.message || '').includes('403')) message = 'Permission denied.';

        return res.status(500).json({ success: false, message });
    }
};



export const debugHerbImageUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '------------------' });
    }
    return res.json({
        success: true,
        file: {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        }
    });
};
