import express from 'express';
import { check } from 'express-validator';
import { registerUser, loginUser, getUserProfile, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    สมัครสมาชิกผู้ใช้ใหม่ พร้อมการตรวจสอบข้อมูล
// @access  Public
router.post('/register', [
    check('firstName', 'กรุณาระบุชื่อ').not().isEmpty(),
    check('email', 'กรุณาใช้อีเมลที่ถูกต้อง').isEmail(),
    check('password', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร').isLength({ min: 6 })
], registerUser);

// @route   POST /api/auth/login
// @desc    เข้าสู่ระบบและรับ Token พร้อมการตรวจสอบข้อมูล
// @access  Public
router.post('/login', [
    check('email', 'กรุณาระบุอีเมล').isEmail(),
    check('password', 'กรุณาระบุรหัสผ่าน').exists()
], loginUser);

// @route   GET /api/auth/profile
// @desc    ดึงข้อมูลโปรไฟล์ผู้ใช้
// @access  Private (ต้องใช้ Token)
router.get('/profile', protect, getUserProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;

