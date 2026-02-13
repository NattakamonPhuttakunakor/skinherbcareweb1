import User from '../models/User.js'; // ตรวจสอบ path ให้ถูกนะครับว่าไฟล์ User.js อยู่ไหน
import jwt from 'jsonwebtoken';

// ฟังก์ชันสร้าง Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    สมัครสมาชิก
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    // ✅ 1. รับค่า age และ occupation เพิ่มเข้ามาจาก Frontend
    const { firstName, lastName, email, password, age, occupation } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        // ✅ 2. บันทึกลง Database
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            age,        // บันทึกอายุ
            occupation, // บันทึกอาชีพ
        });

        if (user) {
            res.status(201).json({
                success: true,
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                age: user.age,               // ส่งกลับไปให้ frontend รู้ด้วย (ถ้าจำเป็น)
                occupation: user.occupation, // ส่งกลับไปให้ frontend รู้ด้วย (ถ้าจำเป็น)
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ success: false, message: 'ข้อมูลผู้ใช้ไม่ถูกต้อง' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    เข้าสู่ระบบ
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role, // เพิ่ม role ให้ frontend รู้ว่าเป็น user หรือ admin
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ success: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    ดึงข้อมูลโปรไฟล์
// @route   GET /api/auth/profile
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            res.json({
                success: true,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    age: user.age,               // ✅ ส่งข้อมูลอายุกลับไปตอนเรียกดูโปรไฟล์
                    occupation: user.occupation, // ✅ ส่งข้อมูลอาชีพกลับไปตอนเรียกดูโปรไฟล์
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    ลืมรหัสผ่าน
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // 1. เช็คว่ามีอีเมลนี้ในระบบมั้ย
        // 2. สร้าง Token ชั่วคราว
        // 3. ส่งอีเมล (Nodemailer)
        console.log('มีการขอรีเซ็ตรหัสผ่านของ:', email);
        res.status(200).json({
            success: true,
            message: 'ระบบได้รับคำขอแล้ว (ต้องไปเขียนระบบส่งเมลต่อ)'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายใน' });
    }
};
