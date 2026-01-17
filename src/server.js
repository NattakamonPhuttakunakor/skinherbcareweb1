import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

// อ่านค่า .env
dotenv.config();

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
    // เชื่อมต่อ Database (ถ้า Connect ไม่ได้ Server จะไม่เริ่มทำงาน)
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

    // --- CORS (จุดสำคัญ: อนุญาตหมด * เพื่อแก้ปัญหา GitHub Pages) ---
    app.use(
      cors({
        origin: '*', // ✅ อนุญาตทุกโดเมน (แก้ปัญหาติดแดง 100%)
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
      })
    );

    // --- Body Parser ---
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // --- Static Files ---
    app.use(express.static(path.join(__dirname, "../public"))); // แก้ path ให้ชี้ไป public นอก folder src ถ้าจำเป็น
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    // --- Health Check (เอาไว้เช็คว่า Server ตื่นหรือยัง) ---
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        message: "Server is running correctly",
        timestamp: new Date().toISOString()
      });
    });

    // --- API Routes ---
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes); // 👉 URL จะเป็น /api/analysis/diagnose
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);

    // --- Root Route (แสดงข้อความหน้าแรก) ---
    app.get("/", (req, res) => {
        res.send("✅ SkinHerbCare API is Running! (Ready for requests)");
    });

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
      console.log(`🌐 CORS enabled for: ALL ORIGINS (*)`);
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

// Run the server
startServer();