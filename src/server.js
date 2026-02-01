import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import axios from "axios"; // ✅ เพิ่ม Axios เพื่อใช้คุยกับ Python

// อ่านค่า .env
dotenv.config();

// 🔥 ระบบกันตาย: ตรวจสอบ Environment Variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET']; // ตัด GEMINI_API_KEY ออกชั่วคราวถ้าไม่ได้ใช้
const missingEnvVars = requiredEnvVars.filter(key => !process.env[key] || process.env[key].includes('your-'));

if (missingEnvVars.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables: ${missingEnvVars.join(', ')}`);
}

// Import Database
import connectDB from "./config/db.js";

// Import Routes
import authRoutes from "./routes/auth.js";
import analysisRoutes from "./routes/analysis.js";
import herbRoutes from "./routes/herbs.js";
import diseaseRoutes from "./routes/diseases.js";
import adminRoutes from "./routes/admin.js";
import geminiRoutes from "./routes/gemini.js";

// 🔥 แก้ __dirname สำหรับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, "../public");
const uploadPath = path.join(__dirname, "../uploads");

async function startServer() {
  try {
    console.log("🔄 Connecting to database...");
    
    // ลองต่อ DB ถ้าไม่ได้ให้ข้ามไปก่อน (เพื่อให้ Server รันได้)
    try {
        await connectDB();
        console.log("✅ Database connected successfully!");
    } catch (dbError) {
        console.warn("⚠️ Database connection failed (Server will start anyway):", dbError.message);
    }

    const app = express();

    // --- Security & Logging ---
    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
    if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

    // --- CORS ---
    app.use(cors({ origin: '*', methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

    // --- Body Parser ---
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // --- Static Files ---
    app.use(express.static(publicPath)); 
    app.use("/uploads", express.static(uploadPath));

    // ==========================================
    // 🌉 สะพานเชื่อม: Node.js -> Python (จุดสำคัญ!)
    // ==========================================
    app.post("/api/bridge/analyze", async (req, res) => {
        try {
            const { symptoms } = req.body;
            console.log("📡 Node.js กำลังส่งข้อมูลไป Python:", symptoms);

            // 🚀 ยิง request ไปหา Python Port 5001
            const response = await axios.post("http://localhost:5001/api/analyze", {
                symptoms: symptoms
            });

            // ✅ ส่งคำตอบจาก Python กลับไปให้หน้าเว็บ
            res.json(response.data);

        } catch (error) {
            console.error("❌ เชื่อมต่อ Python ไม่สำเร็จ:", error.message);
            // กรณี Python ปิดอยู่ หรือ Error
            res.status(500).json({
                success: false,
                message: "ระบบวิเคราะห์ AI (Python) ไม่ตอบสนอง กรุณาตรวจสอบว่ารัน app.py หรือยัง"
            });
        }
    });

    // --- API Routes ---
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes); 
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/gemini", geminiRoutes);

    // ==========================================
    // 🌐 FRONTEND ROUTES (HTML)
    // ==========================================
    app.get("/", (req, res) => res.sendFile(path.join(publicPath, "index.html")));
    app.get("/home", (req, res) => res.sendFile(path.join(publicPath, "index.html")));
    app.get("/login", (req, res) => res.sendFile(path.join(publicPath, "login.html")));
    app.get("/register", (req, res) => res.sendFile(path.join(publicPath, "register.html")));
    app.get("/analysis", (req, res) => res.sendFile(path.join(publicPath, "analyze-disease.html"))); 
    app.get("/analyze-symptoms", (req, res) => res.sendFile(path.join(publicPath, "analyze-symptoms.html")));

    // --- 404 & Error Handler ---
    app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
    app.use((err, req, res, next) => {
      console.error("❌ Error:", err.stack);
      res.status(500).json({ success: false, message: "Internal Server Error" });
    });

    // --- Start Server ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log("\n" + "=".repeat(50));
      console.log(`🚀 Node.js Server running at http://localhost:${PORT}`);
      console.log(`🌉 Python Bridge Route: POST http://localhost:${PORT}/api/bridge/analyze`);
      console.log("✅ Ready to serve...");
      console.log("=".repeat(50) + "\n");
    });

  } catch (error) {
    console.error("❌ Fatal Error:", error);
    process.exit(1);
  }
}

startServer();