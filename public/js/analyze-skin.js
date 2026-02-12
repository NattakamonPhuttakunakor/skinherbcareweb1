document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const analyzeBtn = document.getElementById('analyze-disease-btn');

    if (!resultsContainer || !analyzeBtn) {
        console.warn('analyze-skin.js: required elements not found.');
        return;
    }

    const baseUrl = window.API_BASE_URL
        || (window.location.hostname.includes('netlify.app')
            ? 'https://skinherbcareweb1.onrender.com'
            : window.location.origin);
    const directUrl = window.SKIN_API_URL || '';
    const apiKey = window.SKIN_API_KEY || '';
    const API_URL = directUrl || `${baseUrl}/api/skin/predict`;
    const RENDER_API_BASE = 'https://skinherbcareweb1.onrender.com';

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

    const normalizeSkinResponse = (payload) => {
        if (!payload) return {};
        if (payload.top1 && typeof payload.top1 === 'object') return payload.top1;
        if (payload.data && typeof payload.data === 'object') return payload.data;
        return payload;
    };

    const herbDatabase = {
        acne: [
            { name: 'แตงกวา', prop: 'ลดความมัน กระชับรูขุมขน', img: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=200' },
            { name: 'ขมิ้นชัน', prop: 'ยับยั้งแบคทีเรีย ลดการอักเสบ', img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200' },
            { name: 'ว่านหางจระเข้', prop: 'ลดรอยแดง สมานแผล', img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=200' }
        ],
        psoriasis: [
            { name: 'น้ำมันมะพร้าว', prop: 'ลดอาการผิวแห้ง แตก', img: 'https://images.unsplash.com/photo-1620886568558-763435161427?w=200' },
            { name: 'ว่านหางจระเข้', prop: 'ให้ความชุ่มชื้น ลดอาการลอก', img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=200' }
        ],
        eczema: [
            { name: 'ใบบัวบก', prop: 'ลดอาการฟกช้ำ แก้แพ้', img: 'https://images.unsplash.com/photo-1632808447598-e32501602492?w=200' },
            { name: 'เสลดพังพอน', prop: 'แก้แมลงกัดต่อย ผื่นคัน', img: 'https://medthai.com/wp-content/uploads/2013/08/เสลดพังพอนตัวเมีย.jpg' }
        ],
        melanoma: [
            { name: '⚠️ พบแพทย์', prop: 'ควรปรึกษาแพทย์ผู้เชี่ยวชาญ', img: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }
        ],
        default: [
            { name: 'สมุนไพรบำรุงผิว', prop: 'เพื่อสุขภาพผิวที่ดี', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200' }
        ]
    };

    const renderHerbCards = (herbs) => {
        if (!herbs || herbs.length === 0) {
            return '<div class="text-sm text-gray-700">-</div>';
        }
        return `
            <div class="flex gap-2 flex-wrap pt-2">
                ${herbs.map(h => `
                    <div class="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm flex flex-col justify-center min-w-[100px]">
                        <span class="font-bold text-slate-800 text-sm">🌿 ${h.name}</span>
                        <span class="text-[10px] text-slate-500">${h.prop}</span>
                    </div>
                `).join('')}
            </div>
        `;
    };

    const resolveImage = (raw) => {
        if (!raw) return '';
        const val = String(raw).trim();
        if (!val) return '';
        if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:')) return val;
        if (val.startsWith('/uploads/')) return `${RENDER_API_BASE}${val}`;
        return `${RENDER_API_BASE}/uploads/${val.replace(/^\/+/, '')}`;
    };

    const fetchRecommendedHerbs = async (diseaseName) => {
        const herbContainer = document.getElementById('recommended-herbs-container');
        if (!herbContainer) return;

        herbContainer.innerHTML = '<div class="text-sm text-gray-700">กำลังโหลดสมุนไพรแนะนำ...</div>';

        try {
            const response = await fetch(`${RENDER_API_BASE}/api/herbs?disease=${encodeURIComponent(diseaseName || '')}`);
            const data = await response.json();
            const herbs = (data && (data.herbs || data.data || data)) || [];

            if (Array.isArray(herbs) && herbs.length > 0) {
                herbContainer.innerHTML = `
                    <div class="flex gap-2 flex-wrap pt-2">
                        ${herbs.map((herb) => {
                            const imgSrc = resolveImage(herb.image || herb.image_url || herb.imageUrl || '');
                            const props = Array.isArray(herb.properties) ? herb.properties.join(', ') : (herb.properties || '');
                            return `
                                <div class="bg-yellow-50 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm flex flex-col justify-center min-w-[100px]">
                                    ${imgSrc ? `<img src="${imgSrc}" alt="${herb.name || ''}" class="w-10 h-10 rounded-full object-cover mb-1">` : ''}
                                    <span class="font-bold text-slate-800 text-sm">🌿 ${herb.name || '-'}</span>
                                    <span class="text-[10px] text-slate-500">${props || '-'}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                herbContainer.innerHTML = '<div class="text-sm text-gray-700">ไม่พบสมุนไพรแนะนำสำหรับโรคนี้</div>';
            }
        } catch (error) {
            console.error('Fetch Herb Error:', error);
            herbContainer.innerHTML = '<div class="text-sm text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
        }
    };

    const renderResult = (rawData, diseaseInfo) => {
        const data = normalizeSkinResponse(rawData);
        const labelCandidate = data.label_th || data.label_en || data.label || data.prediction || data.class || data.disease || '';
        const labelEn = String(data.label_en || data.label || data.prediction || '').toLowerCase();
        const labelTh = data.label_th || labelCandidate || 'ไม่ระบุ';
        const scoreRaw = typeof data.score === 'number'
            ? data.score
            : (typeof data.confidence === 'number'
                ? data.confidence
                : Number(data.score || data.confidence));
        const scorePct = Number.isFinite(scoreRaw) ? `${(scoreRaw * 100).toFixed(1)}%` : '-';

        const info = diseaseInfo || {
            symptoms: 'รอการวินิจฉัยเพิ่มเติม',
            advice: 'ควรปรึกษาแพทย์เฉพาะทางเพื่อการวินิจฉัยที่แม่นยำ',
            usage: '',
            medicines: []
        };

        const symptomsText = Array.isArray(info.symptoms)
            ? info.symptoms.join(', ')
            : (info.symptoms || '-');
        const adviceText = info.advice || info.description || '-';
        const diseaseKey = (labelEn || labelCandidate || '').toLowerCase().trim();
        const selectedHerbs = herbDatabase[diseaseKey] || herbDatabase.default;
        const medicinesList = Array.isArray(info.medicines) && info.medicines.length
            ? `<ul class="list-disc list-inside text-sm text-gray-700 mt-2">${info.medicines.map((m) => `<li>${m}</li>`).join('')}</ul>`
            : '';
        const herbsBlock = renderHerbCards(selectedHerbs);

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
                        <p class="text-sm text-gray-700">${symptomsText}</p>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-700 mb-2">คำแนะนำ</h4>
                        <p class="text-sm text-gray-700">${adviceText}</p>
                    </div>
                </div>

                <div class="mt-3 bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                    <h4 class="font-semibold text-yellow-700 mb-2">สมุนไพรที่แนะนำ</h4>
                    <div id="recommended-herbs-container">
                        ${herbsBlock}
                        ${medicinesList}
                    </div>
                </div>

                <p class="text-xs text-red-500 mt-3">*คำเตือน: ผลลัพธ์เป็นการประเมินจาก AI เท่านั้น ไม่สามารถใช้แทนการวินิจฉัยของแพทย์ได้</p>
            </div>
        `;
    };

    const fetchDiseaseInfo = async (labelTh, labelEn) => {
        const token = localStorage.getItem('token') || localStorage.getItem('userToken');
        const isAdmin = !!token;
        const queries = [labelTh, labelEn].filter(Boolean);
        for (const q of queries) {
            const url = isAdmin
                ? `${baseUrl}/api/diseases/admin?q=${encodeURIComponent(q)}`
                : `${baseUrl}/api/diseases?q=${encodeURIComponent(q)}`;
            const res = await fetch(url, {
                headers: isAdmin ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (!res.ok) continue;
            const json = await res.json().catch(() => null);
            const diseases = (json && (json.diseases || json.data)) || [];
            if (Array.isArray(diseases) && diseases.length) {
                const d = diseases[0];
                return {
                    name: d.name || '',
                    symptoms: d.symptoms || '',
                    advice: d.description || '',
                    usage: d.usage || '',
                    medicines: d.medicines || []
                };
            }
        }
        return null;
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

            console.log('[Skin] Preparing upload:', {
                name: currentImageBlob.name,
                type: currentImageBlob.type,
                size: currentImageBlob.size
            });

            const headers = {};
            if (apiKey) headers['X-API-Key'] = apiKey;

            const res = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: formData
            });

            console.log('[Skin] Response status:', res.status);

            if (!res.ok) {
                const contentType = res.headers.get('content-type') || '';
                const errBody = contentType.includes('application/json')
                    ? await res.json().catch(() => ({}))
                    : { message: await res.text().catch(() => res.statusText) };
                const detail = errBody.detail || errBody.message || errBody.error || res.statusText;
                throw new Error(`API Error ${res.status}: ${detail}`);
            }

            const data = await res.json();
            console.log('[Skin] Raw API data:', data);
            const diseaseInfo = await fetchDiseaseInfo(data.label_th, data.label_en);
            renderResult(data, diseaseInfo);
            await fetchRecommendedHerbs((diseaseInfo && diseaseInfo.name) || data.label_th || data.label_en || data.label || '');
        } catch (err) {
            console.error('[Skin] Request failed:', err);
            renderError(err.message || 'ไม่สามารถเชื่อมต่อ API ได้');
        } finally {
            setLoading(false);
        }
    };
});
