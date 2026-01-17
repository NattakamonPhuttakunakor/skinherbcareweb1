document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyze-disease-btn');
    const resultsContainer = document.getElementById('results-container');
    const fileInput = document.getElementById('disease-image-upload');

    // ตรวจสอบให้แน่ใจว่า element ทั้งหมดมีอยู่จริง
    if (!analyzeBtn || !resultsContainer || !fileInput) {
        console.error('Some elements are missing from the page!');
        return;
    }

    analyzeBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) {
            alert('กรุณาอัปโหลดรูปภาพก่อน');
            return;
        }

        // 1. แสดงสถานะกำลังโหลด
        resultsContainer.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; gap: 8px;">
                <svg style="animation: spin 1s linear infinite; width: 20px; height: 20px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style="opacity: 0.25;" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path style="opacity: 0.75;" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>กำลังวิเคราะห์ภาพ... กรุณารอสักครู่</p>
            </div>
        `;
        analyzeBtn.disabled = true; // ปิดปุ่มระหว่างรอผล

        // 2. เตรียมข้อมูลสำหรับส่งไปยัง API
        const formData = new FormData();
        formData.append('image', file); // 'image' คือชื่อ field ที่ backend คาดหวัง

        try {
            // 3. เรียกใช้ Backend API
            const response = await fetch('/api/gemini/analyze-disease-image', {
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
                <div>
                    <strong style="color: var(--primary-text);">ผลการวิเคราะห์เบื้องต้น:</strong>
                    <p style="margin-top: 0.25rem;"><strong>${data.data.condition}</strong></p>
                    <p style="margin-top: 0.5rem;">${data.data.recommendation}</p>
                </div>
            `;
            resultsContainer.innerHTML = resultHtml;

            // 5. บันทึกผลลัพธ์ล่าสุดลงใน localStorage
            const analysisToStore = {
                type: 'ผลการวิเคราะห์รูปโรคผิวหนัง',
                result: `พบอาการที่อาจเป็นไปได้: ${data.data.condition}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('latestAnalysis', JSON.stringify(analysisToStore));

        } catch (error) {
            console.error('Analysis Error:', error);
            resultsContainer.innerHTML = `<p style="color: #dc2626;">ขออภัย, เกิดข้อผิดพลาด: ${error.message}</p>`;
        } finally {
            analyzeBtn.disabled = false; // เปิดปุ่มให้ใช้งานอีกครั้ง
        }
    });
});

