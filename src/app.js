// ไฟล์: src/server.js

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

// ฟังก์ชันหลักที่จะ start ทั้งหมด
async function startServer() {
  try {
    // อ่านค่า .env
    dotenv.config();

    // เชื่อมต่อ Database
    await connectDB();

    const app = express();

    // แก้ path สำหรับ ES module
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // --- 1. ตั้งค่า CORS ---
    app.use(
      cors({
        origin: [
          "http://localhost:5000", // Backend
          "http://localhost:3000", // Frontend Local
          "http://127.0.0.1:5500", // Live Server (VS Code)
          "https://skinherbcare.netlify.app" // ✅ เว็บ Netlify ของคุณ (แก้ชื่อให้ถูกต้อง)
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // --- 2. Serve Static Files ---
    app.use(express.static(path.join(__dirname, "../public")));
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    // --- 3. API Routes ---
    app.use("/api/auth", authRoutes);
    app.use("/api/analysis", analysisRoutes);
    app.use("/api/herbs", herbRoutes);
    app.use("/api/diseases", diseaseRoutes);
    app.use("/api/admin", adminRoutes);

    // --- 4. หน้าแรก (Root Route) ---
    app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../public", "index.html"));
    });

    // --- 5. Start Server ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log("📊 Database connected successfully!");
      console.log("✅ Ready to serve requests...");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Run the server
startServer();