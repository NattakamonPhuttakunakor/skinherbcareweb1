document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('results-container');
    const analyzeBtn = document.getElementById('analyze-disease-btn');

    if (!resultsContainer || !analyzeBtn) {
        console.warn('analyze-skin.js: required elements not found.');
        return;
    }

    const baseUrl = window.API_BASE_URL || window.location.origin;
    const directUrl = window.SKIN_API_URL || '';
    const apiKey = window.SKIN_API_KEY || '';
    const API_URL = directUrl || `${baseUrl}/api/skin/predict`;

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
        if (payload.data && typeof payload.data === 'object') return payload.data;
        return payload;
    };

    const renderResult = (rawData, diseaseInfo) => {
        const data = normalizeSkinResponse(rawData);
        const labelCandidate = data.label_th || data.label_en || data.label || data.prediction || data.class || data.disease || '';
        const labelEn = String(data.label_en || data.label || data.prediction || '').toLowerCase();
        const labelTh = data.label_th || labelCandidate || 'ไม่ระบุ';
        const scoreRaw = typeof data.score === 'number'
            ? data.score
            : (typeof data.confidence === 'number' ? data.confidence : Number(data.score || data.confidence));
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
        const medicinesList = Array.isArray(info.medicines) && info.medicines.length
            ? `<ul class="list-disc list-inside text-sm text-gray-700 mt-2">${info.medicines.map((m) => `<li>${m}</li>`).join('')}</ul>`
            : '<p class="text-sm text-gray-700 mt-2">-</p>';

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
                    ${medicinesList}
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
                ? `/api/diseases/admin?q=${encodeURIComponent(q)}`
                : `/api/diseases?q=${encodeURIComponent(q)}`;
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
        } catch (err) {
            console.error('[Skin] Request failed:', err);
            renderError(err.message || 'ไม่สามารถเชื่อมต่อ API ได้');
        } finally {
            setLoading(false);
        }
    };
});
