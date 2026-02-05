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

    const herbDbCache = {
        loaded: false,
        list: [],
        byNameLower: {}
    };

    const normalizeHerbRecord = (raw, fallbackName = '') => {
        if (!raw) return null;
        const benefitsList = Array.isArray(raw.benefits) ? raw.benefits : null;
        return normalizeHerb({
            name: raw.name || raw.thaiName || fallbackName || '-',
            scientificName: raw.scientificName || raw.scientific_name || '',
            benefits: benefitsList ? benefitsList.join(', ') : (raw.benefits || raw.properties || raw.description || ''),
            usage: raw.usage || '',
            diseases: Array.isArray(raw.diseases) ? raw.diseases : (benefitsList || []),
            precautions: raw.precautions || ''
        });
    };

    const buildHerbIndex = (json) => {
        const list = [];
        const byNameLower = {};

        if (Array.isArray(json)) {
            json.forEach((item) => {
                const herb = normalizeHerbRecord(item);
                if (herb) list.push(herb);
            });
        } else if (json && Array.isArray(json.herbs || json.data)) {
            const items = json.herbs || json.data;
            items.forEach((item) => {
                const herb = normalizeHerbRecord(item);
                if (herb) list.push(herb);
            });
        } else if (json && typeof json === 'object') {
            Object.keys(json).forEach((key) => {
                const herb = normalizeHerbRecord(json[key], key);
                if (herb) list.push(herb);
                const keyLower = String(key || '').toLowerCase();
                if (herb && keyLower && !byNameLower[keyLower]) byNameLower[keyLower] = herb;
            });
        }

        list.forEach((herb) => {
            const nameKey = String(herb.name || '').toLowerCase();
            if (nameKey && !byNameLower[nameKey]) byNameLower[nameKey] = herb;
            const sciKey = String(herb.scientificName || '').toLowerCase();
            if (sciKey && !byNameLower[sciKey]) byNameLower[sciKey] = herb;
        });

        return { list, byNameLower };
    };

    const loadHerbData = async () => {
        try {
            const res = await fetch('/data/herbs.json');
            if (!res.ok) {
                console.warn('Could not load herb database.');
                return false;
            }
            const json = await res.json();
            const { list, byNameLower } = buildHerbIndex(json);
            herbDbCache.list = list;
            herbDbCache.byNameLower = byNameLower;
            herbDbCache.loaded = true;
            console.log('Herb database loaded:', list.length, 'items');
            return true;
        } catch (e) {
            console.error('Error loading herb database:', e);
            return false;
        }
    };

    // Warm the cache (non-blocking)
    loadHerbData();

    const getFileMeta = (file) => {
        const fileName = file?.name || '';
        const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
        return { fileName, baseName };
    };

    const normalizeHerbName = (value) => {
        if (!value) return '-';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            if (typeof value.class_name === 'string') return value.class_name;
            if (typeof value.name === 'string') return value.name;
            if (typeof value.label === 'string') return value.label;
        }
        return '-';
    };

    const normalizeHerb = (herb) => {
        if (!herb) return null;
        return {
            name: normalizeHerbName(herb.name),
            scientificName: herb.scientificName || '',
            benefits: herb.benefits || herb.description || '',
            usage: herb.usage || '',
            diseases: Array.isArray(herb.diseases) ? herb.diseases : [],
            precautions: herb.precautions || '',
            confidence: typeof herb.confidence === 'number' ? herb.confidence : null
        };
    };

    const renderResult = (herb, sourceLabel) => {
        const resultHtml = `
            <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-200 text-left">
                <div class="flex items-start justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-[#111C44]">Result: ${herb.name}</h3>
                        ${sourceLabel ? `<p class="text-xs text-gray-500 mt-1">Source: ${sourceLabel}</p>` : ''}
                        ${herb.scientificName ? `<p class="text-sm text-gray-500 mt-1"><strong>Scientific name:</strong> ${herb.scientificName}</p>` : ''}
                        ${herb.benefits ? `<p class="text-gray-600 mt-2">${herb.benefits}</p>` : ''}
                        ${herb.confidence !== null ? `<p class="text-sm text-gray-500 mt-2"><strong>Confidence:</strong> ${Math.round(herb.confidence)}%</p>` : ''}
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="bg-green-50 border border-green-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-green-700 mb-2">Helps with</h4>
                        ${herb.diseases.length
                            ? `<ul class="list-disc list-inside text-sm text-gray-700">${herb.diseases.map(d => `<li>${d}</li>`).join('')}</ul>`
                            : `<p class="text-sm text-gray-700">No data</p>`}
                    </div>

                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-700 mb-2">Usage</h4>
                        <p class="text-sm text-gray-700">${herb.usage || '-'}</p>
                    </div>
                </div>
                ${herb.precautions ? `
                    <div class="mt-3 bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-yellow-700 mb-2">Precautions</h4>
                        <p class="text-sm text-gray-700">${herb.precautions}</p>
                    </div>
                ` : ''}
            </div>
        `;
        resultsContainer.innerHTML = resultHtml;
    };

    const parseJsonSafe = async (res) => {
        try {
            return await res.json();
        } catch {
            return null;
        }
    };

    const buildHttpError = (res, json, fallbackBody) => {
        const message = (json && (json.message || json.error)) || fallbackBody || res.statusText || 'Request failed';
        const err = new Error(message);
        err.status = res.status;
        err.statusText = res.statusText || '';
        err.details = (json && (json.details || json.error)) || null;
        return err;
    };

    const parsePredictionLabel = (raw) => {
        if (!raw || typeof raw !== 'string') return '';
        const trimmed = raw.trim();
        // Expected formats: "Mangosteen 0.85" or "Mangosteen"
        const parts = trimmed.split(/\s+/);
        if (parts.length <= 1) return trimmed;
        const last = parts[parts.length - 1];
        if (!Number.isNaN(Number(last))) {
            return parts.slice(0, -1).join(' ');
        }
        return trimmed;
    };

    const buildNameCandidates = (raw) => {
        if (!raw) return [];
        const base = String(raw).trim();
        if (!base) return [];
        const candidates = new Set();
        candidates.add(base);
        candidates.add(base.replace(/_/g, ' '));
        if (base.includes('_')) {
            candidates.add(base.split('_')[0]);
        }
        candidates.add(base.replace(/_(peel|leaf|root|seed|flower|bark|stem|fruit)$/i, ''));
        candidates.add(base.replace(/_(peel|leaf|root|seed|flower|bark|stem|fruit)$/i, '').replace(/_/g, ' '));
        return Array.from(candidates).filter(Boolean);
    };

    const extractPrediction = (payload) => {
        if (!payload || !payload.top_prediction) return { label: '', confidence: null };
        let raw = payload.top_prediction;
        if (raw && typeof raw === 'object') {
            raw = raw.class_name || raw.name || raw.label || '';
        }
        const label = parsePredictionLabel(raw);
        let confidence = null;
        if (typeof payload.confidence === 'number') {
            confidence = payload.confidence * 100;
        } else if (typeof payload.top_prediction === 'object') {
            if (typeof payload.top_prediction.confidence === 'number') {
                confidence = payload.top_prediction.confidence * 100;
            } else if (typeof payload.top_prediction.score === 'number') {
                confidence = payload.top_prediction.score * 100;
            }
        } else if (typeof raw === 'string' && raw.trim().match(/\d+(?:\.\d+)?$/)) {
            confidence = Number(raw.trim().match(/\d+(?:\.\d+)?$/)[0]) * 100;
        }
        return { label, confidence: Number.isFinite(confidence) ? confidence : null };
    };

    const analyzeWithGemini = async (formData) => {
        const res = await fetch('/api/python/predict', {
            method: 'POST',
            body: formData
        });
        const json = await parseJsonSafe(res);
        if (!res.ok || !json || json.success === false) {
            const fallbackBody = json ? null : await res.text().catch(() => null);
            throw buildHttpError(res, json, fallbackBody);
        }
        const payload = json.data || json;
        if (payload && payload.top_prediction) {
            const { label, confidence } = extractPrediction(payload);
            return normalizeHerb({
                name: label || payload.top_prediction,
                confidence
            });
        }
        return normalizeHerb(payload);
    };

    const debugUpload = async (formData) => {
        const res = await fetch('/api/python/debug', {
            method: 'POST',
            body: formData
        });
        const json = await parseJsonSafe(res);
        if (!res.ok || !json || json.success === false) {
            const fallbackBody = json ? null : await res.text().catch(() => null);
            throw buildHttpError(res, json, fallbackBody);
        }
        console.log('Upload debug (file received):', json.file);
        return json.file;
    };

    const buildFormData = (file) => {
        const formData = new FormData();
        formData.append('image', file);
        return formData;
    };

    const findHerbFromApi = async (fileMeta) => {
        if (!fileMeta.baseName && !fileMeta.fileName) return null;
        const query = new URLSearchParams();
        if (fileMeta.baseName) query.set('q', fileMeta.baseName);
        if (fileMeta.fileName) query.set('imageName', fileMeta.fileName);
        const res = await fetch(`/api/herbs${query.toString() ? `?${query.toString()}` : ''}`);
        if (!res.ok) return null;
        const json = await res.json().catch(() => null);
        const herbs = (json && (json.herbs || json.data)) || [];
        return normalizeHerb(herbs[0]);
    };

    const findHerbByNameFromApi = async (name) => {
        if (!name) return null;
        const candidates = buildNameCandidates(name);
        for (const candidate of candidates) {
            const query = new URLSearchParams({ q: candidate });
            const res = await fetch(`/api/herbs?${query.toString()}`);
            if (!res.ok) continue;
            const json = await res.json().catch(() => null);
            const herbs = (json && (json.herbs || json.data)) || [];
            const herb = normalizeHerb(herbs[0]);
            if (herb) return herb;
        }
        return null;
    };

    const findHerbFromLocalFile = async (fileMeta) => {
        if (!fileMeta.baseName && !fileMeta.fileName) return null;
        try {
            if (!herbDbCache.loaded) {
                await loadHerbData();
            }
            const list = herbDbCache.list || [];
            const needle = (fileMeta.baseName || fileMeta.fileName || '').toLowerCase();
            const match = list.find((h) => {
                const name = String(h.name || '').toLowerCase();
                const sci = String(h.scientificName || '').toLowerCase();
                const img = String(h.imageOriginalName || '').toLowerCase();
                return name.includes(needle) || sci.includes(needle) || img.includes(needle);
            });
            return normalizeHerb(match);
        } catch {
            return null;
        }
    };

    const findHerbByNameFromLocalFile = async (name) => {
        if (!name) return null;
        try {
            if (!herbDbCache.loaded) {
                await loadHerbData();
            }
            const candidates = buildNameCandidates(name);
            for (const candidate of candidates) {
                const needle = String(candidate).toLowerCase();
                const direct = herbDbCache.byNameLower[needle];
                if (direct) return normalizeHerb(direct);
            }

            const list = herbDbCache.list || [];
            const match = list.find((h) => {
                const n = String(h.name || '').toLowerCase();
                const sci = String(h.scientificName || '').toLowerCase();
                return candidates.some((c) => {
                    const needle = String(c).toLowerCase();
                    return n.includes(needle) || sci.includes(needle);
                });
            });
            return normalizeHerb(match);
        } catch {
            return null;
        }
    };

    analyzeBtn.addEventListener('click', async () => {
        const rawFile = (fileInput && fileInput.files && fileInput.files[0]) || window.currentImageBlob;
        const file =
            rawFile instanceof File
                ? rawFile
                : (rawFile
                    ? new File([rawFile], 'capture.jpg', { type: rawFile.type || 'image/jpeg' })
                    : null);
        if (!file) {
            alert('Please upload an image first.');
            return;
        }

        analyzeBtn.disabled = true;
        resultsContainer.innerHTML = `
            <div class="flex justify-center items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>กำลังวิเคราะห์... กรุณารอสักครู่</p>
            </div>
        `;

        const fileMeta = getFileMeta(file);

        try {
            let herb = null;
            let source = '';
            let lastError = null;

            try {
                // 1) Debug upload: confirm backend receives the file
                await debugUpload(buildFormData(file));
                // 2) Actual analysis
                herb = await analyzeWithGemini(buildFormData(file));
                source = 'AI analysis';
            } catch (err) {
                lastError = err;
            }

            if (herb && herb.name && (!herb.benefits && !herb.usage && (!herb.diseases || herb.diseases.length === 0))) {
                const apiByName = await findHerbByNameFromApi(herb.name);
                if (apiByName) {
                    herb = { ...apiByName, confidence: herb.confidence ?? apiByName.confidence };
                    source = 'Database lookup (AI name)';
                }
            }

            if (herb && herb.name && (!herb.benefits && !herb.usage && (!herb.diseases || herb.diseases.length === 0))) {
                const localByName = await findHerbByNameFromLocalFile(herb.name);
                if (localByName) {
                    herb = { ...localByName, confidence: herb.confidence ?? localByName.confidence };
                    source = 'Local file (AI name)';
                }
            }
            if (herb && herb.name && (!herb.benefits && !herb.usage && (!herb.diseases || herb.diseases.length === 0))) {
                console.warn(`Missing herb data for "${herb.name}". Please add to /data/herbs.json`);
            }

            if (!herb) {
                const apiHerb = await findHerbFromApi(fileMeta);
                if (apiHerb) {
                    herb = apiHerb;
                    source = 'Database lookup (file name)';
                }
            }

            if (!herb) {
                const localHerb = await findHerbFromLocalFile(fileMeta);
                if (localHerb) {
                    herb = localHerb;
                    source = 'Local file (/data/herbs.json)';
                }
            }

            if (!herb) {
                throw lastError || new Error('No matching data found for this image.');
            }

            renderResult(herb, source);

            const analysisToStore = {
                type: 'Herb image analysis',
                result: `Result: ${herb.name}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('latestAnalysis', JSON.stringify(analysisToStore));
        } catch (error) {
            console.error('Analysis Error:', error);
            const status = typeof error.status === 'number' ? error.status : null;
            const statusLine = status ? ` (HTTP ${status})` : '';
            let helpText = 'ไม่สามารถเชื่อมต่อ AI Server ได้';
            if (status === 401 || status === 403) helpText = 'การยืนยันตัวตนล้มเหลว (API Key)';
            if (status === 404) helpText = 'ไม่พบ Endpoint ของ API';
            if (status === 413) helpText = 'ไฟล์ใหญ่เกินไป';
            if (status === 415 || status === 422) helpText = 'รูปแบบไฟล์ไม่ถูกต้อง';
            if (status && status >= 500) helpText = 'ฝั่ง Server มีข้อผิดพลาด';

            const details = error.details ? `<div class="text-xs text-gray-500 mt-2 break-words">${String(error.details)}</div>` : '';

            resultsContainer.innerHTML = `
                <div class="text-red-600">
                    <p>ขออภัย เกิดข้อผิดพลาด: ${error.message}${statusLine}</p>
                    <p class="text-sm mt-1">${helpText}</p>
                    <p class="text-xs text-gray-500 mt-2">แนะนำ: ตรวจสอบสถานะ Server และ Logs ที่ Render แล้วลองใหม่อีกครั้ง</p>
                    ${details}
                </div>
            `;
        } finally {
            analyzeBtn.disabled = false;
        }
    });
});
