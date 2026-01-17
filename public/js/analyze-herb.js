document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-herb-btn');
    const resultsContainer = document.getElementById('results-container');
    const fileInput = document.getElementById('herb-image-upload');
    const imagePreviewBox = document.getElementById('image-preview-box');

    analyzeBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
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
            // 3. เรียกใช้ Backend API
            const response = await fetch('/api/gemini/analyze-herb-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
            }

            const data = await response.json();

            // 4. แสดงผลลัพธ์ที่ได้จาก AI
            const resultHtml = `
                <div class="result-item">
                    <strong class="text-gray-800">สมุนไพรที่พบ:</strong>
                    <p class="mt-1"><strong>${data.data.herbName}</strong></p>
                    <p class="mt-1">${data.data.description}</p>
                </div>
            `;
            resultsContainer.innerHTML = resultHtml;

            // 5. บันทึกผลลัพธ์ล่าสุดลงใน localStorage เพื่อแสดงในหน้าแดชบอร์ด
            const analysisToStore = {
                type: 'ผลการค้นหาข้อมูลจากรูปสมุนไพร',
                result: `พบข้อมูล: ${data.data.herbName}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('latestAnalysis', JSON.stringify(analysisToStore));

        } catch (error) {
            console.error('Analysis Error:', error);
            resultsContainer.innerHTML = `<p class="text-red-600">ขออภัย, เกิดข้อผิดพลาด: ${error.message}</p>`;
        }
    });
});

