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

    const getFileMeta = (file) => {
        const fileName = file?.name || '';
        const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
        return { fileName, baseName };
    };

    const normalizeHerb = (herb) => {
        if (!herb) return null;
        return {
            name: herb.name || '?',
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
                        <h3 class="text-xl font-bold text-[#111C44]">??????????: ${herb.name}</h3>
                        ${sourceLabel ? `<p class="text-xs text-gray-500 mt-1">???????????: ${sourceLabel}</p>` : ''}
                        ${herb.scientificName ? `<p class="text-sm text-gray-500 mt-1"><strong>???????????????:</strong> ${herb.scientificName}</p>` : ''}
                        ${herb.benefits ? `<p class="text-gray-600 mt-2">${herb.benefits}</p>` : ''}
                        ${herb.confidence !== null ? `<p class="text-sm text-gray-500 mt-2"><strong>??????????:</strong> ${Math.round(herb.confidence)}%</p>` : ''}
                    </div>
                </div>

                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="bg-green-50 border border-green-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-green-700 mb-2">???????????????</h4>
                        ${herb.diseases.length
                            ? `<ul class="list-disc list-inside text-sm text-gray-700">${herb.diseases.map(d => `<li>${d}</li>`).join('')}</ul>`
                            : `<p class="text-sm text-gray-700">???????????</p>`}
                    </div>

                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-blue-700 mb-2">????????????????</h4>
                        <p class="text-sm text-gray-700">${herb.usage || '?'}</p>
                    </div>
                </div>
                ${herb.precautions ? `
                    <div class="mt-3 bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                        <h4 class="font-semibold text-yellow-700 mb-2">???????????</h4>
                        <p class="text-sm text-gray-700">${herb.precautions}</p>
                    </div>
                ` : ''}
            </div>
        `;
        resultsContainer.innerHTML = resultHtml;
    };

    const analyzeWithGemini = async (formData) => {
        const res = await fetch('/api/gemini/analyze-herb-image', {
            method: 'POST',
            body: formData
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || json.success === false) {
            const msg = (json && (json.message || json.error)) || '???????????????????????????????????';
            throw new Error(msg);
        }
        return normalizeHerb(json.data || {});
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

    const findHerbFromLocalFile = async (fileMeta) => {
        if (!fileMeta.baseName && !fileMeta.fileName) return null;
        try {
            const res = await fetch('/data/herbs.json');
            if (!res.ok) return null;
            const json = await res.json();
            const list = json.herbs || json.data || json || [];
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

    analyzeBtn.addEventListener('click', async () => {
        const rawFile = (fileInput && fileInput.files && fileInput.files[0]) || window.currentImageBlob;
        const file =
            rawFile instanceof File
                ? rawFile
                : (rawFile
                    ? new File([rawFile], 'capture.jpg', { type: rawFile.type || 'image/jpeg' })
                    : null);
        if (!file) {
            alert('??????????????????????');
            return;
        }

        analyzeBtn.disabled = true;
        resultsContainer.innerHTML = `
            <div class="flex justify-center items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>????????????????... ??????????????</p>
            </div>
        `;

        const formData = new FormData();
        formData.append('image', file);
        const fileMeta = getFileMeta(file);

        try {
            let herb = null;
            let source = '';
            let lastError = null;

            try {
                herb = await analyzeWithGemini(formData);
                source = 'AI ??????????????????';
            } catch (err) {
                lastError = err;
            }

            if (!herb) {
                const apiHerb = await findHerbFromApi(fileMeta);
                if (apiHerb) {
                    herb = apiHerb;
                    source = '????????????? (??????????????)';
                }
            }

            if (!herb) {
                const localHerb = await findHerbFromLocalFile(fileMeta);
                if (localHerb) {
                    herb = localHerb;
                    source = '??????????????? (/data/herbs.json)';
                }
            }

            if (!herb) {
                throw lastError || new Error('?????????????????????????????');
            }

            renderResult(herb, source);

            const analysisToStore = {
                type: '?????????????????????????????',
                result: `????????: ${herb.name}`,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('latestAnalysis', JSON.stringify(analysisToStore));
        } catch (error) {
            console.error('Analysis Error:', error);
            resultsContainer.innerHTML = `<p class="text-red-600">??????, ??????????????: ${error.message}</p>`;
        } finally {
            analyzeBtn.disabled = false;
        }
    });
});
