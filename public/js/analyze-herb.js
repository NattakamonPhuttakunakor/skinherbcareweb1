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
            const fileName = file.name || '';
            const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
            const query = new URLSearchParams();
            if (baseName) query.set('q', baseName);
            if (fileName) query.set('imageName', fileName);
            const res = await fetch(`/api/herbs${query.toString() ? `?${query.toString()}` : ''}`);
            if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลจากฐานข้อมูลได้');
            const json = await res.json();
            const herbs = json.herbs || json.data || [];
            const herb = herbs[0];

            if (!herb) {
                resultsContainer.innerHTML = `
                    <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-left">
                        <p class="text-gray-700">ไม่พบข้อมูลสมุนไพรที่ตรงกับรูปนี้ในฐานข้อมูล</p>
                    </div>
                `;
                return;
            }

            const herbName = herb.name || '—';
            const scientificName = herb.scientificName || '';
            const benefits = herb.description || '';
            const usage = herb.usage || '';
            const diseases = Array.isArray(herb.diseases) ? herb.diseases : [];

            const resultHtml = `
                <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-left">
                    <div class="flex items-start justify-between">
                        <div>
                            <h3 class="text-xl font-bold text-[#111C44]">ผลการค้นหา: ${herbName}</h3>
                            ${scientificName ? `<p class="text-sm text-gray-500 mt-1"><strong>ชื่อวิทยาศาสตร์:</strong> ${scientificName}</p>` : ''}
                            ${benefits ? `<p class="text-gray-600 mt-2">${benefits}</p>` : ''}
                        </div>
                    </div>

                    <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="bg-green-50 border border-green-100 p-3 rounded-lg">
                            <h4 class="font-semibold text-green-700 mb-2">โรคที่บรรเทาได้</h4>
                            ${diseases.length
                                ? `<ul class="list-disc list-inside text-sm text-gray-700">${diseases.map(d => `<li>${d}</li>`).join('')}</ul>`
                                : `<p class="text-sm text-gray-700">ไม่มีข้อมูล</p>`}
                        </div>

                        <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                            <h4 class="font-semibold text-blue-700 mb-2">วิธีใช้เบื้องต้น</h4>
                            <p class="text-sm text-gray-700">${usage || '—'}</p>
                        </div>
                    </div>
                </div>
            `;
            resultsContainer.innerHTML = resultHtml;

            const analysisToStore = {
                type: 'ผลการค้นหาข้อมูลจากรูปสมุนไพร',
                result: `พบข้อมูล: ${herbName}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('latestAnalysis', JSON.stringify(analysisToStore));
        } catch (error) {
            console.error('Analysis Error:', error);
            resultsContainer.innerHTML = `<p class="text-red-600">ขออภัย, เกิดข้อผิดพลาด: ${error.message}</p>`;
        }
    });
});

