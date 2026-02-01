import axios from 'axios';

// ⚠️ URL ของ Python Server (ต้องตรงกับ Port 5001 ที่ Python รันอยู่)
const PYTHON_API_URL = "http://localhost:5001/api/analyze";

/**
 * ================================
 * 📊 ADMIN ANALYSIS (ข้อมูลหลังบ้าน)
 * ================================
 */

/**
 * @desc    Get sales data for the last 6 months
 * @route   GET /api/analysis/sales
 * @access  Private/Admin
 */
export const getSalesData = async (req, res) => {
  try {
    // ในอนาคตสามารถเปลี่ยนเป็นดึงจาก Database จริงได้
    const salesData = {
      labels: ['มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.'],
      data: [12000, 19000, 15000, 25000, 22000, 31000],
    };

    res.status(200).json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * @desc    Get product distribution by category
 * @route   GET /api/analysis/categories
 * @access  Private/Admin
 */
export const getCategoryData = async (req, res) => {
  try {
    const categoryData = {
      labels: ['เซรั่ม', 'ครีม', 'ทำความสะอาด', 'โทนเนอร์', 'อื่นๆ'],
      data: [45, 25, 20, 10, 5],
    };

    res.status(200).json({
      success: true,
      data: categoryData,
    });
  } catch (error) {
    console.error('Error fetching category data:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


/**
 * ================================
 * 🧠 SYMPTOM ANALYSIS (USER - หน้าบ้าน)
 * ================================
 */

/**
 * @desc    Analyze skin symptoms using Python AI
 * @route   POST /api/analysis/diagnose
 * @access  Public
 */
export const diagnoseSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // 1. ตรวจสอบข้อมูลขาเข้า
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอาการที่ต้องการปรึกษา"
      });
    }

    console.log(`📤 Node.js: กำลังส่งอาการ "${symptoms}" ไปให้ Python AI...`);

    // 2. ยิง Request ไปหา Python Flask Server (Port 5001)
    // เราส่ง { symptoms: "..." } ไปให้ Python
    const response = await axios.post(PYTHON_API_URL, { symptoms });

    const aiResult = response.data;

    // 3. (Optional) ถ้า Python ตอบว่าไม่เจอโรค เราอาจจะ Log ไว้ดูภายหลังได้
    if (!aiResult.found) {
        console.log("⚠️ AI Analysis: ไม่พบโรคที่ตรงกัน");
    } else {
        console.log(`✅ AI Analysis: พบโรค "${aiResult.data[0].disease}" (${aiResult.data[0].confidence}%)`);
    }

    // 4. ส่งผลลัพธ์จาก Python กลับไปให้ Frontend ทันที
    // Frontend จะได้รับโครงสร้าง JSON แบบเดียวกับที่ Python ส่งมา
    return res.status(200).json(aiResult);

  } catch (error) {
    console.error("❌ Error connecting to Python Service:", error.message);
    
    // กรณี Python Server ดับ หรือต่อไม่ได้
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        success: false, 
        message: "ขออภัย ระบบวิเคราะห์โรค (AI) กำลังปิดปรับปรุง หรือยังไม่ได้เปิดใช้งาน (Connection Refused)" 
      });
    }

    // Error อื่นๆ
    return res.status(500).json({ 
      success: false, 
      message: "เกิดข้อผิดพลาดภายในระบบเซิร์ฟเวอร์" 
    });
  }
};