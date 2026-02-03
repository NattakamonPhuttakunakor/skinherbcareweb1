import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

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
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปภาพ' });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-')) {
            console.error('❌ GEMINI_API_KEY not configured on Render');
            return res.status(500).json({ 
                success: false, 
                message: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับ AI กรุณาติดต่อผู้ดูแลระบบ",
                detail: "GEMINI_API_KEY is not configured on Render environment"
            });
        }

        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `วิเคราะห์รูปภาพผิวหนังนี้ และให้ความเห็นว่า:
1. มีอาการผิวหนังแบบไหน
2. โรคที่คาดว่าเป็นคืออะไร
3. สมุนไพรไทยที่แนะนำในการรักษา 2-3 ชนิด พร้อมวิธีใช้
ตอบในรูป JSON โดยมี keys: "diagnosis", "disease", "confidence", "herbs", "advice"`;

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

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        // ลบไฟล์ upload ชั่วคราว
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting file:', err); });

        res.json({ success: true, data: data });

    } catch (error) {
        console.error("Gemini Disease Analysis Error:", error);
        if (req.file) fs.unlink(req.file.path, (err) => {});
        res.status(500).json({ success: false, message: "ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้" });
    }
};

export const analyzeHerbImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'กรุณาอัพโหลดรูปภาพ' });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your-')) {
            console.error('❌ GEMINI_API_KEY not configured on Render');
            return res.status(500).json({ 
                success: false, 
                message: "ระบบยังไม่ได้ตั้งค่า API Key สำหรับ AI กรุณาติดต่อผู้ดูแลระบบ",
                detail: "GEMINI_API_KEY is not configured on Render environment"
            });
        }

        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `วิเคราะห์รูปภาพสมุนไพรนี้ และให้ความเห็นว่า:
1. ชื่อสมุนไพรคืออะไร
2. มีประโยชน์ต่อสุขภาพผิวหนังอย่างไร
3. รักษา/บรรเทาโรคผิวหนังอะไรได้บ้าง
4. ความมั่นใจโดยรวม (0-100)
5. วิธีใช้และปริมาณที่แนะนำ
6. ข้อควรระวังและข้อห้าม
ตอบในรูป JSON โดยมี keys: "name", "scientificName", "benefits", "diseases", "confidence", "usage", "precautions"`;

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

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedText);

        // ลบไฟล์ upload ชั่วคราว
        fs.unlink(req.file.path, (err) => { if (err) console.error('Error deleting file:', err); });

        res.json({ success: true, data: data });

    } catch (error) {
        console.error("Gemini Herb Analysis Error:", error);
        if (req.file) fs.unlink(req.file.path, (err) => {});
        res.status(500).json({ success: false, message: "ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้" });
    }
};
