// src/server.js

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Import Database
import connectDB from "./config/db.js";

// Import Routes
import authRoutes from "./routes/auth.js";
import analysisRoutes from "./routes/analysis.js";
import herbRoutes from "./routes/herbs.js";
import diseaseRoutes from "./routes/diseases.js";
import adminRoutes from "./routes/admin.js";

async function startServer() {
  try {
    // โหลด .env
    dotenv.config();

    // Connect DB
    await connectDB();

    const app = express();

    // ES Module path fix
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // ===============================
    // 🌐 CORS (แก้ถูกต้อง)
    // ===============================
    app.use(
      cors({
        origin: "*", // ✅ เปิดทุกเว็บ
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "X-API-Key" // ✅ สำคัญมาก
        ]
        // ❌ ไม่ใช้ credentials เพราะ origin = "*"
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // ===============================
    // 📂 Static Files
    // ===============================
    app.use(express.static(path.join(__dirname, "../public")));
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    // ===============================
    // 🔌 API Routes
    // ===============================
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes);
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);

    // ===============================
    // 🏠 Root Route
    // ===============================
    app.get("/", (req, res) => {
      const indexHtmlPath = path.join(__dirname, "../public", "index.html");
      res.sendFile(indexHtmlPath, (err) => {
        if (err) {
          res.send("✅ API Server is running...");
        }
      });
    });

    // ===============================
    // 🚀 Start Server
    // ===============================
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("📊 Database connected successfully");
      console.log("🌐 CORS: ALL ORIGINS (*)");
      console.log("🔐 Headers allowed: X-API-Key");
      console.log("✅ Ready!");
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
