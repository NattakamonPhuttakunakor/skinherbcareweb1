import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

// อ่านค่า .env
dotenv.config();

// 🔥 ระบบกันตาย: ถ้าไม่มี API_KEY ให้ใส่ค่าหลอกทันที
if (!process.env.API_KEY) {
    console.log("⚠️ Warning: API_KEY missing. Using dummy key to prevent crash.");
    process.env.API_KEY = "123456_dummy_key_for_startup";
}

// Import Database
import connectDB from "./config/db.js";

// Import Routes
import authRoutes from "./routes/auth.js";
import analysisRoutes from "./routes/analysis.js";
import herbRoutes from "./routes/herbs.js";
import diseaseRoutes from "./routes/diseases.js";
import adminRoutes from "./routes/admin.js";

// แก้ __dirname สำหรับ ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    console.log("🔄 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully!");

    const app = express();

    // --- Security Middleware ---
    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false
      })
    );

    // --- Logging Middleware ---
    if (process.env.NODE_ENV === "development") {
      app.use(morgan("dev"));
    }

    // --- CORS ---
    app.use(
      cors({
        origin: '*', 
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
      })
    );

    // --- Body Parser ---
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // --- Static Files (สำคัญมาก: บอกให้ Server รู้จักโฟลเดอร์เก็บรูปและหน้าเว็บ) ---
    app.use(express.static(path.join(__dirname, "../public"))); 
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    // --- Health Check ---
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString()
      });
    });

    // --- API Routes ---
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes); 
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);

    // ==========================================
    // 🌐 FRONTEND ROUTES (ส่วนที่เพิ่มมาใหม่)
    // ==========================================

    // 1. หน้าแรก (Home Page)
    app.get("/", (req, res) => {
        // ให้เปิดไฟล์ home.html เป็นหน้าแรก
        res.sendFile(path.join(__dirname, "../public/home.html"));
    });

    // 2. เผื่อคนพิมพ์ /home
    app.get("/home", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/home.html"));
    });

    // 3. หน้าเข้าสู่ระบบ (Login)
    app.get("/login", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/login.html"));
    });

    // 4. หน้าสมัครสมาชิก (Sign Up)
    app.get("/signup", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/signup.html"));
    });

    // 5. หน้าวิเคราะห์โรค (Analysis)
    // *หมายเหตุ: ถ้าไฟล์หน้าวิเคราะห์ชื่อ index.html ให้ใช้ index.html*
    app.get("/analysis", (req, res) => {
        res.sendFile(path.join(__dirname, "../public/index.html")); 
    });

    // ==========================================

    // --- 404 Handler ---
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl
      });
    });

    // --- Error Handler ---
    app.use((err, req, res, next) => {
      console.error("❌ Error:", err.stack);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
      });
    });

    // --- Start Server ---
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log("\n" + "=".repeat(50));
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log("✅ Ready to serve requests...");
      console.log("=".repeat(50) + "\n");
    });

  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ Failed to start server:");
    console.error(error.message);
    console.error("Make sure MONGO_URI is set in Render Environment Variables");
    console.error("=".repeat(50) + "\n");
    process.exit(1);
  }
}

startServer();