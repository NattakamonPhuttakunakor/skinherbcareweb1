document.addEventListener('DOMContentLoaded', async () => {
    const API_BASE_URL = window.location.hostname.includes('netlify.app')
        ? 'https://skinherbcareweb1.onrender.com'
        : window.location.origin;
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
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
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
            // Demo-only (fixed): no backend yet
            const diseaseName = 'โรคด่างขาว';
            const advice = 'ควรหลีกเลี่ยงแสงแดดจัด ใช้ครีมกันแดดเป็นประจำ และพบแพทย์ผิวหนังเพื่อประเมินเพิ่มเติม';
            const herbs = ['เปลือกมังคุด', 'ว่านหางจระเข้'];
            const herbHtml = herbs.length
                ? herbs.map((h) => {
                    if (typeof h === 'string') {
                        return `<li><strong>${h}</strong></li>`;
                    }
                    const name = h.name || h.herb || 'ไม่ทราบสมุนไพร';
                    const props = Array.isArray(h.properties) && h.properties.length
                        ? `<div style="margin-top: 0.25rem; color: #6b7280;">${h.properties.join(', ')}</div>`
                        : '';
                    const usage = h.usage
                        ? `<div style="margin-top: 0.25rem;"><strong>วิธีใช้:</strong> ${h.usage}</div>`
                        : '';
                    return `<li><strong>${name}</strong>${props}${usage}</li>`;
                }).join('')
                : '<li>ไม่พบสมุนไพรแนะนำ</li>';

            // 4. แสดงผลลัพธ์ที่ได้จาก AI
            const resultHtml = `
                <div>
                    <strong style="color: var(--primary-text);">ผลการวิเคราะห์เบื้องต้น:</strong>
                    <p style="margin-top: 0.25rem;"><strong>${diseaseName}</strong></p>
                    ${advice ? `<p style="margin-top: 0.5rem;">${advice}</p>` : ''}
                    <div style="margin-top: 0.75rem;">
                        <strong>สมุนไพรแนะนำ:</strong>
                        <ul style="margin-top: 0.5rem; padding-left: 1rem; list-style: disc;">
                            ${herbHtml}
                        </ul>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML = resultHtml;

            // 5. บันทึกผลลัพธ์ล่าสุดลงใน localStorage
            const analysisToStore = {
                type: 'ผลการวิเคราะห์รูปโรคผิวหนัง',
                result: `พบอาการที่อาจเป็นไปได้: ${diseaseName}`,
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

