import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// @desc    วิเคราะห์อาการและแนะนำสมุนไพร
export const suggestHerbs = async (req, res) => {
    const { symptoms } = req.body;

    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ success: false, message: "API Key not found" });
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

// สำหรับ analyzeDiseaseImage และ analyzeHerbImage ต้องใช้ model: "gemini-pro-vision" (หรือ gemini-1.5-flash) 
// และต้องแปลงไฟล์รูปภาพเป็น base64 ก่อนส่งไปหา API (logic จะซับซ้อนขึ้นเล็กน้อย)
// แนะนำให้แก้ suggestHerbs ให้ผ่านก่อนครับ
export const analyzeDiseaseImage = (req, res) => {
    res.json({ success: true, message: 'ฟีเจอร์วิเคราะห์รูปภาพกำลังอยู่ระหว่างการพัฒนา' });
};

export const analyzeHerbImage = (req, res) => {
    res.json({ success: true, message: 'ฟีเจอร์วิเคราะห์รูปภาพสมุนไพรกำลังอยู่ระหว่างการพัฒนา' });
};