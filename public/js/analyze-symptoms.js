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

    const analyzeBtn = document.getElementById('analyze-symptom-btn');
    const resultsContainer = document.getElementById('results-container');
    const textInput = document.getElementById('symptom-input');
    const TREATMENT_PREVIEW_LEN = 150;

    const escapeHtml = (text) => String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const truncateText = (text, maxLen = TREATMENT_PREVIEW_LEN) => {
        const raw = String(text || '').trim();
        if (raw.length <= maxLen) return raw;
        return `${raw.substring(0, maxLen)}...`;
    };

    window.toggleReadMore = (button) => {
        const contentSpan = button.previousElementSibling;
        if (!contentSpan) return;

        const fullText = button.getAttribute('data-full-text') || '';
        if (button.innerText === 'อ่านเพิ่มเติม') {
            contentSpan.innerText = fullText;
            button.innerText = 'ย่อกลับ';
        } else {
            contentSpan.innerText = truncateText(fullText, TREATMENT_PREVIEW_LEN);
            button.innerText = 'อ่านเพิ่มเติม';
        }
    };

    analyzeBtn.addEventListener('click', async () => {
        const symptoms = textInput.value.trim();

        if (symptoms === '') {
            alert('กรุณากรอกอาการของคุณก่อน');
            return;
        }

        // Ensure results are visible
        resultsContainer.classList.remove('hidden');

        // Loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '⏳ กำลังวิเคราะห์...';
        resultsContainer.innerHTML =
            '<p class="text-gray-500 text-center">กำลังประมวลผล กรุณารอสักครู่...</p>';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            // ✅ API ที่ถูกต้อง (ใช้ relative URL เพื่อให้ทำงานบน localhost และ Render)
            const res = await fetch(`${API_BASE_URL}/api/analysis/diagnose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symptoms }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const json = await res.json();

            if (!json.success) {
                resultsContainer.innerHTML =
                    `<p class="text-red-500 text-center">${json.message}</p>`;
                return;
            }

            const results = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
            if (!results.length) {
                resultsContainer.innerHTML = `<p class="text-gray-600 text-center">ยังไม่พบข้อมูลที่ตรงกับอาการนี้</p>`;
                return;
            }
            const extractHerbsFromAdvice = (text) => {
                if (!text) return [];
                const match = text.match(/สมุนไพร[:：]\s*([^\n]+)/);
                if (!match) return [];
                return match[1]
                    .split(/,|，|และ|กับ/)
                    .map(s => s.trim())
                    .filter(Boolean);
            };
            const fetchHerbUsage = async (name) => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/herbs?q=${encodeURIComponent(name)}`);
                    const json = await res.json();
                    const herb = (json.herbs && json.herbs[0]) || (json.data && json.data[0]);
                    return herb ? herb.usage : '';
                } catch {
                    return '';
                }
            };
            let htmlContent = `<h4 class="text-xl font-bold mb-4 text-green-800">🧠 ผลการวิเคราะห์</h4>`;

            for (const result of results) {
                const disease = result.disease || result.prediction || 'ไม่ทราบ';
                const confidenceRaw = typeof result.confidence === 'number' ? result.confidence : 0;
                const confidencePct = confidenceRaw > 1 ? Math.round(confidenceRaw) : Math.round(confidenceRaw * 100);
                const advice = result.advice || result.treatment || result.recommendation || '';
                const adviceText = String(advice || '').trim();
                const shortAdvice = truncateText(adviceText, TREATMENT_PREVIEW_LEN);
                const adviceHtml = adviceText
                    ? `<p>
                            <strong>วิธีรักษาเบื้องต้น:</strong>
                            <span class="treatment-content">${escapeHtml(shortAdvice)}</span>
                            ${adviceText.length > TREATMENT_PREVIEW_LEN
                                ? `<button type="button" onclick="toggleReadMore(this)" data-full-text="${escapeHtml(adviceText)}" class="text-green-600 font-bold ml-1 hover:underline">อ่านเพิ่มเติม</button>`
                                : ''}
                       </p>`
                    : '';

                const rawHerbs = Array.isArray(result.herbs) ? result.herbs : [];
                const herbNames = rawHerbs.length
                    ? rawHerbs.map(h => (typeof h === 'string' ? h : (h.name || h.herb))).filter(Boolean)
                    : extractHerbsFromAdvice(advice);

                const herbDetails = await Promise.all(
                    herbNames.map(async (name) => ({
                        name,
                        usage: await fetchHerbUsage(name)
                    }))
                );

                htmlContent += `
                    <div class="mb-4 p-4 border rounded-lg bg-green-50">
                        <p><strong>โรคที่คาดว่าเป็น:</strong> ${disease}</p>
                        <p><strong>ความมั่นใจ:</strong> ${confidencePct}%</p>
                        ${adviceHtml}
                    </div>

                    <h5 class="text-lg font-bold mb-2 text-green-700">🌿 สมุนไพรที่แนะนำ</h5>
                `;

                if (herbDetails.length > 0) {
                    herbDetails.forEach((herb) => {
                        htmlContent += `
                            <div class="mb-2 p-3 border border-green-100 rounded bg-white">
                                • <strong>${herb.name}</strong>
                                ${herb.usage ? `<div class="text-sm text-gray-600 mt-1"><strong>วิธีใช้:</strong> ${herb.usage}</div>` : ''}
                            </div>
                        `;
                    });
                } else {
                    htmlContent += `<p class="text-gray-600">ไม่มีข้อมูลสมุนไพร</p>`;
                }
            }

            resultsContainer.innerHTML = htmlContent;

        } catch (error) {
            console.error('Error:', error);
            if (error.name === 'AbortError') {
                resultsContainer.innerHTML =
                    `<p class="text-red-500 text-center">
                        ⏱️ ระบบใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง
                    </p>`;
                return;
            }
            resultsContainer.innerHTML =
                `<p class="text-red-500 text-center">
                    ❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้<br>
                    (ตรวจสอบว่า npm run dev หรือ npm start ทำงานอยู่)
                </p>`;
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = 'วิเคราะห์';
        }
    });
});
