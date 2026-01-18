// ไฟล์: src/controllers/analysisController.js

import Disease from '../models/Disease.js';
import Herb from '../models/Herb.js';

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

    // 2. ดึงโรคทั้งหมดจาก MongoDB
    const allDiseases = await Disease.find();

    if (!allDiseases || allDiseases.length === 0) {
      return res.status(500).json({
        success: false,
        message: "ไม่มีข้อมูลโรคในระบบ"
      });
    }

    // 3. ค้นหาโรคที่ตรงกับอาการที่ป้อนเข้ามา (โดยการแมตช์คำหลัก)
    const input = symptoms.toLowerCase();
    let bestMatch = null;
    let highestScore = 0;

    for (const disease of allDiseases) {
      let score = 0;

      // ตรวจสอบชื่อโรค
      if (disease.name.toLowerCase().includes(input) || input.includes(disease.name.toLowerCase())) {
        score += 100;
      }

      // ตรวจสอบคำหลักในอาการ
      if (disease.symptoms && disease.symptoms.length > 0) {
        disease.symptoms.forEach(symptom => {
          const symptomLower = symptom.toLowerCase();
          // แมตช์คำสำคัญ
          if (input.includes(symptomLower) || symptomLower.includes(input)) {
            score += 50;
          }
          // หาค่าความคล้ายคลึง (Simple similarity)
          const inputWords = input.split(/\s+/);
          const symptomWords = symptomLower.split(/\s+/);
          const matches = inputWords.filter(w => symptomWords.some(sw => sw.includes(w)));
          score += matches.length * 10;
        });
      }

      // เก็บค่าที่ดีที่สุด
      if (score > highestScore) {
        highestScore = score;
        bestMatch = disease;
      }
    }

    // 4. ถ้าไม่พบจากการแมตช์ ให้ส่งคำแนะนำ
    if (!bestMatch || highestScore < 10) {
      return res.status(200).json({
        success: true,
        data: {
          disease: "อาการไม่ชัดเจนในระบบ",
          confidence: 0.0,
          advice: "แนะนำให้ปรึกษาแพทย์ผิวหนังเพื่อการวินิจฉัยที่แม่นยำ อาการของคุณอาจต้องการการตรวจสอบเพิ่มเติม",
          herbs: []
        }
      });
    }

    // 5. ดึงสมุนไพรที่เกี่ยวข้อง (สมุนไพรที่อาจช่วยรักษาโรคนี้)
    const relatedHerbs = await Herb.find({
      $or: [
        { properties: { $in: bestMatch.symptoms || [] } },
        { description: { $regex: bestMatch.name, $options: 'i' } }
      ]
    }).limit(5);

    // 6. ส่งผลลัพธ์กลับไป
    res.status(200).json({
      success: true,
      data: {
        disease: bestMatch.name,
        confidence: Math.min(0.95, highestScore / 100), // ความมั่นใจ (0-0.95)
        advice: `${bestMatch.description?.substring(0, 200) || 'โรคนี้ต้องการการดูแลผิวหนังที่เหมาะสม'} แนะนำให้ปรึกษาแพทย์ผิวหนังเพื่อการวินิจฉัยอย่างชัดเจน`,
        herbs: relatedHerbs.map(h => h.name) || []
      }
    });

  } catch (error) {
    console.error("Error analyzing symptoms:", error);
    res.status(500).json({
      success: false,
      message: "Server Error occurred during analysis"
    });
  }
};