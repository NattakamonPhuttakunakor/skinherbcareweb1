document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    const userRaw = localStorage.getItem('user');
    if (!token || !userRaw) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
        return;
    }

    try {
        const res = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!res.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('userToken');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            window.location.href = '/login.html';
            return;
        }
    } catch (e) {
        window.location.href = '/login.html';
        return;
    }

    const analyzeBtn = document.getElementById('analyze-herb-btn');
    const resultsContainer = document.getElementById('results-container');
    const fileInput = document.getElementById('herb-image-upload');
    const imagePreviewBox = document.getElementById('image-preview-box');

    analyzeBtn.addEventListener('click', async () => {
        const file = (fileInput && fileInput.files && fileInput.files[0]) || window.currentImageBlob;
        if (!file) {
            alert('กรุณาอัปโหลดรูปภาพก่อน');
            return;
        }

        // 1. แสดงสถานะกำลังโหลด
        resultsContainer.innerHTML = `
            <div class="flex justify-center items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>กำลังค้นหาข้อมูล... กรุณารอสักครู่</p>
            </div>
        `;

        // 2. เตรียมข้อมูลสำหรับส่งไปยัง API
        const formData = new FormData();
        formData.append('image', file); // 'image' คือชื่อ field ที่ backend คาดหวัง

        try {
            resultsContainer.innerHTML = `
                <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-left">
                    <p class="text-gray-700">ระบบวิเคราะห์รูปสมุนไพรด้วย AI ถูกปิดใช้งานชั่วคราว</p>
                    <p class="text-sm text-gray-500 mt-2">หากต้องการเปิดใช้งานอีกครั้ง ให้ติดต่อผู้ดูแลระบบ</p>
                </div>
            `;
        } catch (error) {
            console.error('Analysis Error:', error);
            resultsContainer.innerHTML = `<p class="text-red-600">ขออภัย, เกิดข้อผิดพลาด: ${error.message}</p>`;
        }
    });
});

