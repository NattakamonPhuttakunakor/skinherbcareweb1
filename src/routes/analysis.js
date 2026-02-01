// ✅ ไม่ต้อง import fetch เพราะ Node v20 มีมาให้ในตัวครับ

export const diagnoseSymptoms = async (req, res) => {
    try {
        const { symptoms } = req.body;

        // 1. ตรวจสอบ input ให้ละเอียดขึ้น เพื่อป้องกันการส่งค่าว่าง
        if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
            return res.status(400).json({ success: false, message: "กรุณาระบุอาการ" });
        }

        console.log(`📤 Node ส่งไป Python: "${symptoms}"`);

        // 2. ดึงค่าจาก Env ที่ตั้งไว้
        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
        const apiKey = process.env.API_KEY; 

        const response = await fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey // 🔑 ส่ง Key ปลดล็อก AI
            },
            body: JSON.stringify({ 
                symptoms: symptoms.trim() 
            }),
            // เพิ่ม timeout เพื่อไม่ให้ Node ค้างถ้า Python หลับ
            signal: AbortSignal.timeout(15000) 
        });

        // 3. จัดการ Error กรณี Key ผิด หรือ AI พัง
        if (!response.ok) {
            if (response.status === 401) throw new Error("API Key ไม่ถูกต้อง (Unauthorized)");
            throw new Error(`Python API Error: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Python ตอบกลับ:", data);

        // 4. ส่งผลลัพธ์กลับไปให้หน้าเว็บ (ใช้รูปแบบที่ยืดหยุ่นที่สุด)
        res.json({
            success: true,
            found: data.ok || true,
            result: data.prediction || data.result || "วิเคราะห์สำเร็จ",
            confidence: data.confidence || 0,
            recommendation: data.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม",
            // เผื่อหน้าบ้านเรียกใช้ตัวแปรอื่น
            prediction: data.prediction,
            data: data.data || []
        });

    } catch (error) {
        console.error("❌ Node Error:", error.message);
        
        // ถ้าเชื่อมต่อไม่ได้ (AI หลับ) ส่ง 503 เพื่อให้หน้าเว็บรู้ว่าต้องรอ
        const statusCode = (error.message.includes('fetch failed') || error.name === 'AbortError') ? 503 : 500;
        
        res.status(statusCode).json({ 
            success: false,
            message: "ไม่พบข้อมูลที่ชัดเจน", 
            error: error.message 
        });
    }
};

export const getSalesData = async (req, res) => {
    res.json({ success: true, message: "Sales data fetched" });
};

export const getCategoryData = async (req, res) => {
    res.json({ success: true, message: "Category data fetched" });
};