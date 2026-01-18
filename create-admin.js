import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // ตรวจสอบ admin ที่มีอยู่แล้ว
    const existingAdmin = await User.findOne({ email: 'admin@skinherbcare.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin มีอยู่แล้ว:', existingAdmin.email);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
    } else {
      // สร้าง Admin ใหม่
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'SkinHerbCare',
        email: 'admin@skinherbcare.com',
        password: 'admin123456', // ⚠️ เปลี่ยนรหัสผ่านนี้หลังจากสร้างแล้ว!
        age: 30,
        occupation: 'Administrator',
        role: 'admin' // ✅ กำหนดบทบาทเป็น admin
      });

      console.log('✅ สร้าง Admin Account สำเร็จ!');
      console.log('📧 Email:', adminUser.email);
      console.log('🔑 Password: admin123456');
      console.log('⚠️  กรุณาเปลี่ยนรหัสผ่านหลังจากล็อกอินแล้ว');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
};

createAdmin();
