document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = window.location.hostname.includes('netlify.app')
        ? 'https://skinherbcareweb1.onrender.com'
        : window.location.origin;
    // --- 1. ค้นหา Element ที่ต้องใช้ ---
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordErrorMsg = document.getElementById('passwordError');
    const serverErrorMsg = document.getElementById('serverError'); // Element ใหม่สำหรับข้อความจาก Server

    // --- 2. ฟังก์ชันตรวจสอบว่ารหัสผ่านตรงกัน (Client-side) ---
    const validatePasswords = () => {
        if (passwordInput.value !== confirmPasswordInput.value && confirmPasswordInput.value !== '') {
            confirmPasswordInput.classList.add('password-mismatch');
            passwordErrorMsg.classList.remove('hidden');
            return false;
        } else {
            confirmPasswordInput.classList.remove('password-mismatch');
            passwordErrorMsg.classList.add('hidden');
            return true;
        }
    };

    // ตรวจสอบทุกครั้งที่พิมพ์
    passwordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    // --- 3. จัดการการส่งฟอร์มเมื่อกด "ลงทะเบียน" ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // ป้องกันไม่ให้ฟอร์มรีเฟรชหน้า
        serverErrorMsg.classList.add('hidden'); // ซ่อน Error เก่า

        // ตรวจสอบรหัสผ่านอีกครั้งก่อนส่ง
        if (!validatePasswords()) {
            return;
        }

        // ดึงข้อมูลจากฟอร์ม
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const password = passwordInput.value;

        try {
            // --- 4. ส่งข้อมูลไปยัง Backend API ---
            const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email, password }),
            });

            const data = await response.json();

            if (!data.success) {
                // ถ้า Server ตอบกลับมาว่ามีปัญหา (เช่น อีเมลซ้ำ)
                throw new Error(data.message || 'การสมัครสมาชิกล้มเหลว');
            }

            // --- 5. เมื่อสมัครสำเร็จ ---
            alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            window.location.href = '/login.html'; // พาไปยังหน้าล็อกอิน

        } catch (error) {
            // แสดง Error ที่ได้รับจาก Server
            serverErrorMsg.textContent = error.message;
            serverErrorMsg.classList.remove('hidden');
        }
    });
});

