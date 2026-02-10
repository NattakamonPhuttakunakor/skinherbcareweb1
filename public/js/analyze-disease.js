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

    const herbDatabase = {
        acne: [
            { name: 'แตงกวา', prop: 'ลดความมัน กระชับรูขุมขน', img: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=200' },
            { name: 'ขมิ้นชัน', prop: 'ยับยั้งแบคทีเรีย ลดอักเสบ', img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200' },
            { name: 'มังคุด', prop: 'ยับยั้งเชื้อ P.acne', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Mangosteen.jpeg/220px-Mangosteen.jpeg' }
        ],
        psoriasis: [
            { name: 'ว่านหางจระเข้', prop: 'ให้ความชุ่มชื้น ลดอาการลอก', img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=200' },
            { name: 'น้ำมันมะพร้าว', prop: 'ลดอาการผิวแห้ง แตก', img: 'https://images.unsplash.com/photo-1620886568558-763435161427?w=200' },
            { name: 'ทองพันชั่ง', prop: 'แก้กลากเกลื้อน โรคผิวหนัง', img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_x_example' }
        ],
        eczema: [
            { name: 'เสลดพังพอน', prop: 'ถอนพิษแมลงสัตว์กัดต่อย', img: 'https://medthai.com/wp-content/uploads/2013/08/เสลดพังพอนตัวเมีย.jpg' },
            { name: 'ใบบัวบก', prop: 'ลดอาการฟกช้ำ สมานแผล', img: 'https://images.unsplash.com/photo-1632808447598-e32501602492?w=200' }
        ],
        melanoma: [
            { name: '⚠️ ควรพบแพทย์', prop: 'โรคร้ายแรง โปรดปรึกษาแพทย์เฉพาะทางทันที', img: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }
        ],
        default: [
            { name: 'สมุนไพรบำรุงผิว', prop: 'เพื่อสุขภาพผิวที่ดี', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200' }
        ]
    };

    const renderHerbCards = (herbs) => {
        if (!herbs || herbs.length === 0) {
            return '<li>ไม่พบสมุนไพรแนะนำ</li>';
        }
        return herbs.map((h) => `
            <li style="list-style: none; margin-bottom: 8px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${h.img}" alt="${h.name}" style="width:46px;height:46px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                    <div>
                        <div style="font-weight:700;">${h.name}</div>
                        <div style="font-size:12px;color:#6b7280;">${h.prop}</div>
                    </div>
                </div>
            </li>
        `).join('');
    };

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
            const diseaseKey = String(diseaseName || '').toLowerCase().trim();
            const selectedHerbs = herbDatabase[diseaseKey] || herbDatabase.default;
            const herbHtml = renderHerbCards(selectedHerbs);

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

