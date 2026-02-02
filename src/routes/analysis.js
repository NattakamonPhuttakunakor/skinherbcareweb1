import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * POST /api/analysis/analyze
 * รับ symptoms จาก frontend แล้วส่งต่อไป Python
 */
router.post("/analyze", async (req, res) => {
  try {
    const { symptoms } = req.body;

    // 1️⃣ validate input
    if (!symptoms || typeof symptoms !== "string" || symptoms.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "กรุณาระบุอาการ"
      });
    }

    // 2️⃣ env
    const pythonUrl = process.env.PYTHON_API_URL; // ต้องลงท้ายด้วย /predict
    const apiKey = process.env.API_KEY || "fp_yolo_2026_secret_x93k";

    if (!pythonUrl) {
      console.error("❌ Missing PYTHON_API_URL");
      return res.status(500).json({
        success: false,
        message: "Server configuration error"
      });
    }

    console.log("📤 Node → Python:", pythonUrl);
    console.log("💬 Symptoms:", symptoms);

    // 3️⃣ call Python (JSON ล้วน)
    const response = await axios.post(
      pythonUrl,
      { symptoms },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        timeout: 60000
      }
    );

    console.log("✅ Python response:", response.data);

    // 4️⃣ ส่งกลับ frontend
    return res.json({
      success: true,
      ...response.data
    });

  } catch (err) {
    console.error("❌ Analyze error:", err.message);

    // Python ตอบ error code กลับมา
    if (err.response) {
      return res
        .status(err.response.status)
        .json(err.response.data);
    }

    // Node พังเอง
    return res.status(500).json({
      success: false,
      message: "ไม่สามารถวิเคราะห์ได้"
    });
  }
});

export default router;
