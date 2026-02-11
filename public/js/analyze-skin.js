document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const analyzeBtn = document.getElementById('analyze-disease-btn');
    let lastAnalysisPayload = null;
    let lastAnalyzedImage = null;

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

    const setLoading = (isLoading) => {
        analyzeBtn.disabled = isLoading;
        analyzeBtn.textContent = isLoading ? 'à¸à¸³à¸¥à¸±à¸‡à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œ...' : 'à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œ';
    };

    const renderError = (message) => {
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <p class="text-red-600 font-semibold">à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”</p>
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
            { name: 'à¹à¸•à¸‡à¸à¸§à¸²', prop: 'à¸¥à¸”à¸„à¸§à¸²à¸¡à¸¡à¸±à¸™ à¸à¸£à¸°à¸Šà¸±à¸šà¸£à¸¹à¸‚à¸¸à¸¡à¸‚à¸™', img: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=200' },
            { name: 'à¸‚à¸¡à¸´à¹‰à¸™à¸Šà¸±à¸™', prop: 'à¸¢à¸±à¸šà¸¢à¸±à¹‰à¸‡à¹à¸šà¸„à¸—à¸µà¹€à¸£à¸µà¸¢ à¸¥à¸”à¸à¸²à¸£à¸­à¸±à¸à¹€à¸ªà¸š', img: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200' },
            { name: 'à¸§à¹ˆà¸²à¸™à¸«à¸²à¸‡à¸ˆà¸£à¸°à¹€à¸‚à¹‰', prop: 'à¸¥à¸”à¸£à¸­à¸¢à¹à¸”à¸‡ à¸ªà¸¡à¸²à¸™à¹à¸œà¸¥', img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=200' }
        ],
        psoriasis: [
            { name: 'à¸™à¹‰à¸³à¸¡à¸±à¸™à¸¡à¸°à¸žà¸£à¹‰à¸²à¸§', prop: 'à¸¥à¸”à¸­à¸²à¸à¸²à¸£à¸œà¸´à¸§à¹à¸«à¹‰à¸‡ à¹à¸•à¸', img: 'https://images.unsplash.com/photo-1620886568558-763435161427?w=200' },
            { name: 'à¸§à¹ˆà¸²à¸™à¸«à¸²à¸‡à¸ˆà¸£à¸°à¹€à¸‚à¹‰', prop: 'à¹ƒà¸«à¹‰à¸„à¸§à¸²à¸¡à¸Šà¸¸à¹ˆà¸¡à¸Šà¸·à¹‰à¸™ à¸¥à¸”à¸­à¸²à¸à¸²à¸£à¸¥à¸­à¸', img: 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?w=200' }
        ],
        eczema: [
            { name: 'à¹ƒà¸šà¸šà¸±à¸§à¸šà¸', prop: 'à¸¥à¸”à¸­à¸²à¸à¸²à¸£à¸Ÿà¸à¸Šà¹‰à¸³ à¹à¸à¹‰à¹à¸žà¹‰', img: 'https://images.unsplash.com/photo-1632808447598-e32501602492?w=200' },
            { name: 'à¹€à¸ªà¸¥à¸”à¸žà¸±à¸‡à¸žà¸­à¸™', prop: 'à¹à¸à¹‰à¹à¸¡à¸¥à¸‡à¸à¸±à¸”à¸•à¹ˆà¸­à¸¢ à¸œà¸·à¹ˆà¸™à¸„à¸±à¸™', img: 'https://medthai.com/wp-content/uploads/2013/08/à¹€à¸ªà¸¥à¸”à¸žà¸±à¸‡à¸žà¸­à¸™à¸•à¸±à¸§à¹€à¸¡à¸µà¸¢.jpg' }
        ],
        melanoma: [
            { name: 'âš ï¸ à¸žà¸šà¹à¸žà¸—à¸¢à¹Œ', prop: 'à¸„à¸§à¸£à¸›à¸£à¸¶à¸à¸©à¸²à¹à¸žà¸—à¸¢à¹Œà¸œà¸¹à¹‰à¹€à¸Šà¸µà¹ˆà¸¢à¸§à¸Šà¸²à¸', img: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' }
        ],
        default: [
            { name: 'à¸ªà¸¡à¸¸à¸™à¹„à¸žà¸£à¸šà¸³à¸£à¸¸à¸‡à¸œà¸´à¸§', prop: 'à¹€à¸žà¸·à¹ˆà¸­à¸ªà¸¸à¸‚à¸ à¸²à¸žà¸œà¸´à¸§à¸—à¸µà¹ˆà¸”à¸µ', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=200' }
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
                        <span class="font-bold text-slate-800 text-sm">ðŸŒ¿ ${h.name}</span>
                        <span class="text-[10px] text-slate-500">${h.prop}</span>
                    </div>
                `).join('')}
            </div>
        `;
    };

    const renderResult = (rawData, diseaseInfo) => {
        const data = normalizeSkinResponse(rawData);
        const labelCandidate = data.label_th || data.label_en || data.label || data.prediction || data.class || data.disease || '';
        const labelEn = String(data.label_en || data.label || data.prediction || '').toLowerCase();
        const labelTh = data.label_th || labelCandidate || 'à¹„à¸¡à¹ˆà¸£à¸°à¸šà¸¸';
        const scoreRaw = typeof data.score === 'number'
            ? data.score
            : (typeof data.confidence === 'number'
                ? data.confidence
                : Number(data.score || data.confidence));
        const scorePct = Number.isFinite(scoreRaw) ? `${(scoreRaw * 100).toFixed(1)}%` : '-';

        const info = diseaseInfo || {
            symptoms: 'à¸£à¸­à¸à¸²à¸£à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡',
            advice: 'à¸„à¸§à¸£à¸›à¸£à¸¶à¸à¸©à¸²à¹à¸žà¸—à¸¢à¹Œà¹€à¸‰à¸žà¸²à¸°à¸—à¸²à¸‡à¹€à¸žà¸·à¹ˆà¸­à¸à¸²à¸£à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¸—à¸µà¹ˆà¹à¸¡à¹ˆà¸™à¸¢à¸³',
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
        const canPublish = Boolean(localStorage.getItem('token') || localStorage.getItem('userToken'));

        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h3 class="font-bold text-lg">à¸œà¸¥à¸à¸²à¸£à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œ: ${labelTh}</h3>
                        <p class="text-sm text-gray-600 mt-1">(${labelEn || 'unknown'})</p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-500">à¸„à¸§à¸²à¸¡à¸¡à¸±à¹ˆà¸™à¹ƒà¸ˆ</div>
                        <div class="text-2xl font-bold text-green-600">${scorePct}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div class="bg-green-50 border border-green-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-green-700 mb-2">à¸­à¸²à¸à¸²à¸£à¹€à¸šà¸·à¹‰à¸­à¸‡à¸•à¹‰à¸™</h4>
                        <p class="text-sm text-gray-700">${symptomsText}</p>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-700 mb-2">à¸„à¸³à¹à¸™à¸°à¸™à¸³</h4>
                        <p class="text-sm text-gray-700">${adviceText}</p>
                    </div>
                </div>

                <div class="mt-3 bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                    <h4 class="font-semibold text-yellow-700 mb-2">à¸ªà¸¡à¸¸à¸™à¹„à¸žà¸£à¸—à¸µà¹ˆà¹à¸™à¸°à¸™à¸³</h4>
                    <div id="recommended-herbs-container">
                        ${herbsBlock}
                        ${medicinesList}
                    </div>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                    <button id="publish-disease-btn" type="button" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm ${canPublish ? '' : 'opacity-60 cursor-not-allowed'}" ${canPublish ? '' : 'disabled'}>
                        เผยแพร่ไปหน้าแนะนำ
                    </button>
                    <a href="/index.html" class="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">กลับหน้าแรก</a>
                </div>
                <p class="text-xs text-red-500 mt-3">*à¸„à¸³à¹€à¸•à¸·à¸­à¸™: à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œà¹€à¸›à¹‡à¸™à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸ˆà¸²à¸ AI à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹ƒà¸Šà¹‰à¹à¸—à¸™à¸à¸²à¸£à¸§à¸´à¸™à¸´à¸ˆà¸‰à¸±à¸¢à¸‚à¸­à¸‡à¹à¸žà¸—à¸¢à¹Œà¹„à¸”à¹‰</p>
            </div>
        `;

        lastAnalysisPayload = {
            name: labelTh || labelCandidate || labelEn || 'ผลการวิเคราะห์โรคผิวหนัง',
            engName: labelEn || '',
            description: adviceText || 'ผลวิเคราะห์จากระบบ',
            symptoms: Array.isArray(info.symptoms)
                ? info.symptoms
                : String(symptomsText || '').split(',').map((s) => s.trim()).filter(Boolean),
            medicines: Array.isArray(info.medicines) && info.medicines.length
                ? info.medicines
                : selectedHerbs.map((h) => h.name).filter(Boolean),
            usage: info.usage || '',
            published: true
        };

        const publishBtn = document.getElementById('publish-disease-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', async () => {
                const previous = publishBtn.textContent;
                publishBtn.disabled = true;
                publishBtn.textContent = 'กำลังเผยแพร่...';
                try {
                    await publishAnalysisResult(lastAnalysisPayload, lastAnalyzedImage);
                    publishBtn.textContent = 'เผยแพร่สำเร็จ';
                    window.location.href = '/index.html';
                } catch (err) {
                    console.error('[Skin] Publish failed:', err);
                    alert(err.message || 'เผยแพร่ไม่สำเร็จ');
                    publishBtn.disabled = false;
                    publishBtn.textContent = previous;
                }
            });
        }
    };


    const buildDiseaseFormData = (payload, imageFile) => {
        const form = new FormData();
        form.append('name', payload.name || '');
        form.append('engName', payload.engName || '');
        form.append('description', payload.description || '');
        form.append('symptoms', JSON.stringify(Array.isArray(payload.symptoms) ? payload.symptoms : []));
        form.append('medicines', JSON.stringify(Array.isArray(payload.medicines) ? payload.medicines : []));
        form.append('usage', payload.usage || '');
        form.append('published', payload.published ? 'true' : 'false');
        if (imageFile instanceof File || imageFile instanceof Blob) {
            form.append('image', imageFile, imageFile.name || `analysis-${Date.now()}.jpg`);
        }
        return form;
    };

    const getToken = () => localStorage.getItem('token') || localStorage.getItem('userToken') || '';

    const publishAnalysisResult = async (payload, imageFile) => {
        const token = getToken();
        if (!token) throw new Error('กรุณาเข้าสู่ระบบก่อนเผยแพร่');
        if (!payload || !payload.name || !payload.description) {
            throw new Error('ข้อมูลไม่ครบสำหรับการเผยแพร่');
        }

        const headers = { 'Authorization': `Bearer ${token}` };
        const searchRes = await fetch(`${baseUrl}/api/diseases/admin?q=${encodeURIComponent(payload.name)}`, { headers });
        if (!searchRes.ok) {
            if (searchRes.status === 403) throw new Error('บัญชีนี้ไม่มีสิทธิ์เผยแพร่ข้อมูล (ต้องเป็นแอดมิน)');
            throw new Error('ไม่สามารถตรวจสอบข้อมูลโรคเดิมได้');
        }
        const searchJson = await searchRes.json().catch(() => ({}));
        const existingList = searchJson.diseases || searchJson.data || [];
        const existing = Array.isArray(existingList)
            ? existingList.find((d) => String(d.name || '').trim().toLowerCase() === String(payload.name || '').trim().toLowerCase())
            : null;

        const form = buildDiseaseFormData(payload, imageFile);
        const endpoint = existing ? `${baseUrl}/api/diseases/${existing._id}` : `${baseUrl}/api/diseases`;
        const method = existing ? 'PUT' : 'POST';
        const res = await fetch(endpoint, { method, headers, body: form });
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const msg = errJson.message || errJson.error || `HTTP ${res.status}`;
            if (res.status === 403) throw new Error('บัญชีนี้ไม่มีสิทธิ์เผยแพร่ข้อมูล (ต้องเป็นแอดมิน)');
            throw new Error(`เผยแพร่ไม่สำเร็จ: ${msg}`);
        }
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
            alert('à¹‚à¸›à¸£à¸”à¹€à¸¥à¸·à¸­à¸à¸£à¸¹à¸›à¸ à¸²à¸ž');
            return;
        }

        lastAnalyzedImage = currentImageBlob;
        setLoading(true);
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow text-left">
                <p class="text-gray-600">à¸à¸³à¸¥à¸±à¸‡à¸§à¸´à¹€à¸„à¸£à¸²à¸°à¸«à¹Œ...</p>
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
        } catch (err) {
            console.error('[Skin] Request failed:', err);
            renderError(err.message || 'à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­ API à¹„à¸”à¹‰');
        } finally {
            setLoading(false);
        }
    };
});
