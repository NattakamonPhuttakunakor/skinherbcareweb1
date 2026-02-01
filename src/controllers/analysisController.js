import axios from 'axios';

// ⚠️ ต้องตรงกับ Port ที่ Python รัน (5001)
const PYTHON_API_URL = "http://localhost:5001/api/analyze";

/**
 * ================================
 * 📊 ADMIN ANALYSIS (ข้อมูลหลังบ้าน)
 * ================================
 */
export const getSalesData = async (req, res) => {
  try {
    const salesData = {
      labels: ['มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.'],
      data: [12000, 19000, 15000, 25000, 22000, 31000],
    };
    res.status(200).json({ success: true, data: salesData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getCategoryData = async (req, res) => {
  try {
    const categoryData = {
      labels: ['เซรั่ม', 'ครีม', 'ทำความสะอาด', 'โทนเนอร์', 'อื่นๆ'],
      data: [45, 25, 20, 10, 5],
    };
    res.status(200).json({ success: true, data: categoryData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


/**
 * ================================
 * 🧠 SYMPTOM ANALYSIS (USER - เชื่อมต่อ Python AI)
 * ================================
 */
export const diagnoseSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // 1. ตรวจสอบ Input
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอาการที่ต้องการปรึกษา"
      });
    }

    console.log(`📤 Node.js -> Python: ส่งอาการ "${symptoms}"`);

    // 2. ยิงไปหา Python (Timeout 5 วินาที กันค้าง)
    const response = await axios.post(PYTHON_API_URL, { symptoms }, { timeout: 5000 });
    const aiResult = response.data;

    // 3. Log ผลลัพธ์
    if (aiResult.found) {
        console.log(`✅ AI เจอ: ${aiResult.data[0].disease} (${aiResult.data[0].confidence}%)`);
    } else {
        console.log(`⚠️ AI ไม่เจอโรคที่มั่นใจพอ (ส่งกลับให้ Frontend แจ้ง user)`);
    }

    // 4. ส่งคืน Frontend
    return res.status(200).json(aiResult);

  } catch (error) {
    console.error("❌ Python Service Error:", error.message);
    
    // กรณี Python ยังไม่เปิด
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: "ระบบ AI ยังไม่พร้อมใช้งาน (กรุณาเปิดไฟล์ app.py)" 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบวิเคราะห์" 
    });
  }
};