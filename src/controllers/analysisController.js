// ไฟล์: src/controllers/analysisController.js

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
 * @desc    Analyze skin symptoms and suggest herbs
 * @route   POST /api/analysis/diagnose
 * @access  Public
 */
export const diagnoseSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // 1. เช็คว่ามีการส่งข้อมูลมาไหม
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "กรุณากรอกอาการที่ต้องการปรึกษา"
      });
    }

    // 2. Mock Logic (ระบบวินิจฉัยเบื้องต้นแบบ Keyword)
    // อนาคตเปลี่ยนตรงนี้เป็นเชื่อมต่อ Gemini AI หรือ Database ได้
    let result = {
      disease: "อาการไม่ชัดเจน",
      confidence: 0.0,
      advice: "แนะนำให้ปรึกษาแพทย์ผิวหนังเพื่อการวินิจฉัยที่แม่นยำ",
      herbs: []
    };

    const input = symptoms.toLowerCase(); // แปลงเป็นตัวพิมพ์เล็ก (เผื่อพิมพ์อังกฤษ)

    if (input.includes("สิว") || input.includes("อักเสบ")) {
      result = {
        disease: "สิวอักเสบ (Acne Vulgaris)",
        confidence: 0.85,
        advice: "รักษาความสะอาดใบหน้า หลีกเลี่ยงการบีบแกะสิว ใช้ผลิตภัณฑ์ที่อ่อนโยน",
        herbs: ["ว่านหางจระเข้", "ขมิ้นชัน", "ชุมเห็ดเทศ"]
      };
    } else if (input.includes("คัน") || input.includes("ผื่น") || input.includes("แดง")) {
      result = {
        disease: "ผื่นแพ้สัมผัส / ผดผื่น",
        confidence: 0.78,
        advice: "หลีกเลี่ยงสิ่งที่อาจก่อให้เกิดการระคายเคือง ประคบเย็นหากมีอาการคันมาก",
        herbs: ["ใบบัวบก", "พญายอ", "ว่านหางจระเข้"]
      };
    } else if (input.includes("แห้ง") || input.includes("ลอก") || input.includes("ขุย")) {
      result = {
        disease: "ผิวแห้งขาดน้ำ (Dry Skin)",
        confidence: 0.80,
        advice: "ดื่มน้ำให้เพียงพอ ทามอยส์เจอไรเซอร์สม่ำเสมอ หลีกเลี่ยงน้ำอุ่นจัด",
        herbs: ["น้ำมันมะพร้าว", "ว่านหางจระเข้", "แตงกวา"]
      };
    } else if (input.includes("หมอง") || input.includes("คล้ำ") || input.includes("แดด")) {
      result = {
        disease: "ผิวหมองคล้ำจากแดด",
        confidence: 0.75,
        advice: "ทาครีมกันแดดเป็นประจำ สครับผิวสัปดาห์ละ 1-2 ครั้ง",
        herbs: ["มะขามเปียก", "ขมิ้นชัน", "มะนาว"]
      };
    }

    // 3. ส่งผลลัพธ์กลับไป
    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Error analyzing symptoms:", error);
    res.status(500).json({
      success: false,
      message: "Server Error occurred during analysis"
    });
  }
};