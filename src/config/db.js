import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log("... กำลังเคาะประตูบ้าน MongoDB ...");
    const conn = await mongoose.connect(process.env.MONGO_URI); // ✅ ใช้ MONGO_URI ให้ตรงกับ .env
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1); // ปิดโปรแกรมถ้าเชื่อมต่อไม่ได้
  }
};

export default connectDB;