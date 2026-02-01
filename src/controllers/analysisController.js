import axios from 'axios';

// URL ของ Python Server (ต้องตรงกับ Port 5001)
const PYTHON_API_URL = "http://localhost:5001/api/analyze";

export const diagnoseSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;

    // เช็คข้อมูลเข้า
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim() === "") {
      return res.status(400).json({ success: false, message: "กรุณาระบุอาการ" });
    }

    console.log(`📤 Node ส่งไป Python: "${symptoms}"`);

    // ยิงไปหา Python AI
    const response = await axios.post(PYTHON_API_URL, { symptoms }, { timeout: 5000 });
    const aiResult = response.data;

    // Log ผลลัพธ์ที่ Node ได้รับ (ดูใน Terminal ของ Node)
    if(aiResult.found) {
        console.log(`✅ Node รับผล: เจอโรค ${aiResult.data[0].disease} (${aiResult.data[0].confidence}%)`);
    } else {
        console.log(`⚠️ Node รับผล: ไม่เจอโรค`);
    }

    // ส่งคืนหน้าเว็บ
    return res.status(200).json(aiResult);

  } catch (error) {
    console.error("❌ Node Error:", error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, message: "AI Server ไม่ตอบสนอง (เปิด app.py หรือยัง?)" });
    }
    return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" });
  }
};

// Functions อื่นๆ (Placeholder)
export const getSalesData = (req, res) => res.json({ success: true, message: "Sales Data" });
export const getCategoryData = (req, res) => res.json({ success: true, message: "Category Data" });