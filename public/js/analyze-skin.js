document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const analyzeBtn = document.getElementById('analyze-disease-btn');

    if (!resultsContainer || !analyzeBtn) {
        console.warn('analyze-skin.js: required elements not found.');
        return;
    }

    const API_URL = 'https://b37b065bacf4.ngrok-free.app/predict';
    const API_KEY = 'skin-func-66xe25';

    const skinDatabase = {
        acne: {
            symptoms: 'มีตุ่มนูนแดง หรือมีหนอง หัวสิวอุดตัน',
            advice: 'รักษาความสะอาดหน้า หลีกเลี่ยงการบีบแกะ ใช้ยาแต้มสิวที่มี Benzoyl Peroxide หรือ Salicylic Acid'
        },
        melasma: {
            symptoms: 'มีรอยปื้นสีน้ำตาล หรือสีเทาบนใบหน้า',
            advice: 'หลีกเลี่ยงแสงแดดจัด ทาครีมกันแดดเป็นประจำ และปรึกษาแพทย์เพื่อใช้ยาทาฝ้า'
        },
        freckles: {
            symptoms: 'จุดสีน้ำตาลเล็กๆ กระจายตัว บริเวณที่ถูกแดด',
            advice: 'ทาครีมกันแดดสม่ำเสมอ หากกังวลเรื่องความสวยงามสามารถทำเลเซอร์ได้'
        },
        eczema: {
            symptoms: 'ผิวแห้ง แดง คัน ลอกเป็นขุย',
            advice: 'หลีกเลี่ยงสิ่งที่แพ้ ทาครีมบำรุงผิวให้ชุ่มชื้น และใช้ยาทาลดอักเสบตามแพทย์สั่ง'
        },
        ringworm: {
            symptoms: 'ผื่นวงแดง ขอบนูน คัน',
            advice: 'รักษาความสะอาด ร่างกายให้แห้ง ใช้ยาต้านเชื้อราทาบริเวณที่เป็น'
        },
        normal: {
            symptoms: 'ผิวหนังปกติ สุขภาพดี',
            advice: 'หมั่นทาครีมกันแดดและทำความสะอาดผิวหน้าอย่างสม่ำเสมอ'
        }
    };

    const setLoading = (isLoading) => {
        analyzeBtn.disabled = isLoading;
        analyzeBtn.textContent = isLoading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์';
    };

    const renderError = (message) => {
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <p class="text-red-600 font-semibold">เกิดข้อผิดพลาด</p>
                <p class="text-sm text-gray-600 mt-1">${message}</p>
            </div>
        `;
    };

    const renderResult = (data) => {
        const labelEn = String(data.label_en || '').toLowerCase();
        const labelTh = data.label_th || 'ไม่ระบุ';
        const scoreRaw = typeof data.score === 'number' ? data.score : Number(data.score);
        const scorePct = Number.isFinite(scoreRaw) ? `${(scoreRaw * 100).toFixed(1)}%` : '-';

        const info = skinDatabase[labelEn] || {
            symptoms: 'รอการวินิจฉัยเพิ่มเติม',
            advice: 'ควรปรึกษาแพทย์เฉพาะทางเพื่อการวินิจฉัยที่แม่นยำ'
        };

        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h3 class="font-bold text-lg">ผลการวิเคราะห์: ${labelTh}</h3>
                        <p class="text-sm text-gray-600 mt-1">(${labelEn || 'unknown'})</p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500">ความมั่นใจ</div>
                        <div class="text-2xl font-bold text-green-600">${scorePct}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div class="bg-green-50 border border-green-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-green-700 mb-2">อาการเบื้องต้น</h4>
                        <p class="text-sm text-gray-700">${info.symptoms}</p>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-700 mb-2">คำแนะนำ</h4>
                        <p class="text-sm text-gray-700">${info.advice}</p>
                    </div>
                </div>

                <p class="text-xs text-red-500 mt-3">*คำเตือน: ผลลัพธ์เป็นการประเมินจาก AI เท่านั้น ไม่สามารถใช้แทนการวินิจฉัยของแพทย์ได้</p>
            </div>
        `;
    };

    window.runSkinAnalysis = async ({ currentImageBlob, analyzeBtn: passedBtn }) => {
        const btn = passedBtn || analyzeBtn;
        if (!currentImageBlob) {
            alert('โปรดเลือกรูปภาพ');
            return;
        }

        setLoading(true);
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <p class="text-gray-600">กำลังวิเคราะห์...</p>
            </div>
        `;

        try {
            const formData = new FormData();
            formData.append('file', currentImageBlob);

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'X-API-Key': API_KEY
                },
                body: formData
            });

            if (!res.ok) {
                throw new Error(`API Error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            renderResult(data);
        } catch (err) {
            renderError(err.message || 'ไม่สามารถเชื่อมต่อ API ได้');
        } finally {
            setLoading(false);
        }
    };
});
