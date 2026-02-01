// ✅ ใช้ fetch ที่ติดมากับ Node v20.10.0 ได้เลย ไม่ต้อง import axios หรือ node-fetch

export const diagnoseSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // 1. เช็คข้อมูลเข้า
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
      return res.status(400).json({ success: false, message: "กรุณาระบุอาการ" });
    }

    console.log(`📤 Node กำลังส่งไป Python: "${symptoms}"`);

    // 2. ดึงค่าจาก Environment Variables ที่ตั้งไว้ใน Render
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://finalproject-3-uprs.onrender.com/predict';
    const apiKey = process.env.API_KEY; 

    // 3. ยิงไปหา Python AI พร้อมส่ง API Key ไปปลดล็อก
    const response = await fetch(pythonApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey // 🔑 สำคัญมาก: ตัวนี้จะแก้ปัญหา 401 Unauthorized
      },
      body: JSON.stringify({ symptoms: symptoms.trim() }),
      signal: AbortSignal.timeout(10000) // ตั้ง timeout 10 วินาที ป้องกันค้าง
    });

    // 4. เช็คผลตอบกลับจาก AI
    if (!response.ok) {
      // ถ้า AI ตอบกลับเป็น 401/403 แปลว่า Key ผิด
      if (response.status === 401 || response.status === 403) {
        throw new Error("API Key ไม่ถูกต้องหรือยังไม่ได้ตั้งค่า");
      }
      throw new Error(`AI Server ตอบกลับผิดพลาด: ${response.status}`);
    }

    const aiResult = await response.json();
    console.log("✅ Node ได้รับผลลัพธ์จาก Python:", aiResult);

    // 5. ส่งคืนหน้าเว็บโดยปรับรูปแบบให้ตรงกับที่หน้าบ้านต้องการ
    return res.status(200).json({
      success: true,
      found: aiResult.ok || false,
      prediction: aiResult.prediction || "ไม่พบข้อมูลที่ชัดเจน",
      confidence: aiResult.confidence || 0,
      recommendation: aiResult.recommendation || "ควรปรึกษาผู้เชี่ยวชาญเพิ่มเติม",
      // เผื่อหน้าบ้านต้องการใช้ data array แบบเดิม
      data: aiResult.data || [{ disease: aiResult.prediction, confidence: aiResult.confidence }]
    });

  } catch (error) {
    console.error("❌ Node Error:", error.message);
    
    // ถ้าเชื่อมต่อไม่ได้เลย (AI หลับ) ให้ส่ง 503
    if (error.name === 'AbortError' || error.message.includes('fetch failed')) {
      return res.status(503).json({ 
        success: false, 
        message: "AI Server กำลังเริ่มต้นใหม่ หรือไม่ตอบสนอง (ลองอีกครั้งใน 1 นาที)" 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "ไม่พบข้อมูลที่ชัดเจน",
      error: error.message 
    });
  }
};

// --- Admin Functions ---
export const getSalesData = (req, res) => res.json({ success: true, message: "Sales Data Fetched" });
export const getCategoryData = (req, res) => res.json({ success: true, message: "Category Data Fetched" });