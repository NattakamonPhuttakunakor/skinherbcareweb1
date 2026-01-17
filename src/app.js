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

    // --- 1. ตั้งค่า CORS (แก้ใหม่: เปิดรับทุกเว็บ) ---
    app.use(
      cors({
        origin: '*', // 🚩 อนุญาตทั้งหมด (แก้ปัญหา GitHub Pages เข้าไม่ได้)
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // --- 2. Serve Static Files ---
    // (สมมติว่า server.js อยู่ใน folder src ให้ถอยกลับไป 1 ขั้นเพื่อหา public)
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
      // พยายามส่งไฟล์ index.html ถ้าหาไม่เจอให้ส่งข้อความบอก
      const indexHtmlPath = path.join(__dirname, "../public", "index.html");
      res.sendFile(indexHtmlPath, (err) => {
          if (err) {
              res.send("API Server is running... (Cannot find index.html in public folder)");
          }
      });
    });

    // --- 5. Start Server ---
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log("📊 Database connected successfully!");
      console.log("🌐 CORS enabled for: ALL ORIGINS (*)");
      console.log("✅ Ready to serve requests...");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

// Run the server
startServer();