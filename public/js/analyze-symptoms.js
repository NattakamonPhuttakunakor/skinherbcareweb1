document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('❌ กรุณาเข้าสู่ระบบก่อนใช้งาน');
        window.location.href = '/login.html';
        return;
    }

    const analyzeBtn = document.getElementById('analyze-symptom-btn');
    const resultsContainer = document.getElementById('results-container');
    const textInput = document.getElementById('symptom-input');

    analyzeBtn.addEventListener('click', async () => {
        const symptoms = textInput.value.trim();

        if (symptoms === '') {
            alert('กรุณากรอกอาการของคุณก่อน');
            return;
        }

        // Loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '⏳ กำลังวิเคราะห์...';
        resultsContainer.innerHTML =
            '<p class="text-gray-500 text-center">กำลังประมวลผล กรุณารอสักครู่...</p>';

        try {
            // ✅ API ที่ถูกต้อง (ใช้ relative URL เพื่อให้ทำงานบน localhost และ Render)
            const res = await fetch('/api/analysis/diagnose', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symptoms }),
            });

            const json = await res.json();

            if (!json.success) {
                resultsContainer.innerHTML =
                    `<p class="text-red-500 text-center">${json.message}</p>`;
                return;
            }

            const result = Array.isArray(json.data) ? json.data[0] : (json.data || {});
            const disease = result.disease || result.prediction || 'ไม่ทราบ';
            const confidenceRaw = typeof result.confidence === 'number' ? result.confidence : 0;
            const confidencePct = confidenceRaw > 1 ? Math.round(confidenceRaw) : Math.round(confidenceRaw * 100);
            const advice = result.advice || result.treatment || result.recommendation || '';

            const extractHerbsFromAdvice = (text) => {
                if (!text) return [];
                const match = text.match(/สมุนไพร[:：]\s*([^\n]+)/);
                if (!match) return [];
                return match[1]
                    .split(/,|，|และ|กับ/)
                    .map(s => s.trim())
                    .filter(Boolean);
            };

            const rawHerbs = Array.isArray(result.herbs) ? result.herbs : [];
            const herbNames = rawHerbs.length
                ? rawHerbs.map(h => (typeof h === 'string' ? h : (h.name || h.herb))).filter(Boolean)
                : extractHerbsFromAdvice(advice);

            const fetchHerbUsage = async (name) => {
                try {
                    const res = await fetch(`/api/herbs?q=${encodeURIComponent(name)}`);
                    const json = await res.json();
                    const herb = (json.herbs && json.herbs[0]) || (json.data && json.data[0]);
                    return herb ? herb.usage : '';
                } catch {
                    return '';
                }
            };

            const herbDetails = await Promise.all(
                herbNames.map(async (name) => ({
                    name,
                    usage: await fetchHerbUsage(name)
                }))
            );

            // ✅ แสดงผลลัพธ์
            let htmlContent = `
                <h4 class="text-xl font-bold mb-4 text-green-800">🧠 ผลการวิเคราะห์</h4>

                <div class="mb-4 p-4 border rounded-lg bg-green-50">
                    <p><strong>โรคที่คาดว่าเป็น:</strong> ${disease}</p>
                    <p><strong>ความมั่นใจ:</strong> ${confidencePct}%</p>
                    ${advice ? `<p><strong>คำแนะนำ:</strong> ${advice}</p>` : ''}
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

            resultsContainer.innerHTML = htmlContent;

        } catch (error) {
            console.error('Error:', error);
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
