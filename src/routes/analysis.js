import fetch from 'node-fetch';

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms) {
            return res.status(400).json({ message: "กรุณาระบุอาการ" });
        }

        console.log(`📤 Node ส่งไป Python: "${symptoms}"`);

        // เรียกใช้ URL และ KEY จาก Environment Variables ที่ตั้งไว้
        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = process.env.API_KEY; 

        const response = await fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // 👈 ส่งรหัสผ่านไปยืนยันตัวตนตามที่ AI ร้องขอ
            },
            body: JSON.stringify({ 
                symptoms: symptoms 
            })
        });

        if (!response.ok) {
            throw new Error(`Python API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับ:", data);

        // ส่งข้อมูลกลับไปให้หน้าเว็บ
        res.json({
            success: true,
            result: data.prediction || data.result || "วิเคราะห์สำเร็จ",
            confidence: data.confidence || 0,
            recommendation: data.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม"
        });

    } catch (error) {
        console.error("❌ Node Error:", error.message);
        res.status(500).json({ 
            message: "ไม่พบข้อมูลที่ชัดเจน", 
            error: error.message 
        });
    }
};

// --- ส่วนของ Admin (ตัวอย่างโครงสร้าง) ---
export const getSalesData = async (req, res) => {
    res.json({ message: "Sales data fetched" });
};

export const getCategoryData = async (req, res) => {
    res.json({ message: "Category data fetched" });
};