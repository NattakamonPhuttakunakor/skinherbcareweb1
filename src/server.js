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
    // เพิ่ม www. เข้าไปเผื่อบางที Netlify redirect มา
    const allowedOrigins = [
      "http://localhost:5000",
      "http://localhost:3000",
      "http://127.0.0.1:5500",
      "http://127.0.0.1:5501",
      process.env.FRONTEND_URL,
      "https://skinherbcare.netlify.app",
      "https://www.skinherbcare.netlify.app"
    ].filter(Boolean);

    app.use(
      cors({
        origin: function (origin, callback) {
          // อนุญาต requests ที่ไม่มี origin (เช่น mobile apps หรือ curl requests)
          if (!origin) return callback(null, true);
          
          if (
            allowedOrigins.indexOf(origin) !== -1 ||
            process.env.NODE_ENV === "development"
          ) {
            callback(null, true);
          } else {
            console.log("Blocked by CORS:", origin); // Log เพื่อดูว่าใครโดนบล็อก
            callback(new Error("Not allowed by CORS"));
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
      })
    );

    // --- Body Parser ---
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // --- Static Files ---
    // 🚩 แก้ไข: ลบ .. ออก เพราะ server.js น่าจะอยู่ที่ root folder แล้ว
    app.use(express.static(path.join(__dirname, "public")));
    app.use("/uploads", express.static(path.join(__dirname, "uploads")));

    // --- Health Check ---
    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    });

    // --- API Routes ---
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes);
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);

    // --- Root Route ---
    app.get("/", (req, res) => {
        // เช็คว่ามีไฟล์ index.html จริงไหม ถ้าไม่มีให้แสดงข้อความแทน
        const indexFile = path.join(__dirname, "public", "index.html");
        res.sendFile(indexFile, (err) => {
            if (err) res.send("API Server is running...");
        });
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
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 CORS enabled for: ${allowedOrigins.join(", ")}`);
      console.log("✅ Ready to serve requests...");
      console.log("=".repeat(50) + "\n");
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("👋 SIGTERM received, closing server gracefully...");
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("\n" + "=".repeat(50));
    console.error("❌ Failed to start server:");
    console.error(error.message);
    console.error("=".repeat(50) + "\n");
    process.exit(1);
  }
}

// Run the server
startServer();