document.addEventListener('DOMContentLoaded', () => {
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
            // ✅ API ที่ถูกต้อง
            const res = await fetch('http://localhost:5000/api/analysis/diagnose', {
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

            const data = json.data;

            // ✅ แสดงผลลัพธ์
            let htmlContent = `
                <h4 class="text-xl font-bold mb-4 text-green-800">🧠 ผลการวิเคราะห์</h4>

                <div class="mb-4 p-4 border rounded-lg bg-green-50">
                    <p><strong>โรคที่คาดว่าเป็น:</strong> ${data.disease}</p>
                    <p><strong>ความมั่นใจ:</strong> ${Math.round(data.confidence * 100)}%</p>
                    <p><strong>คำแนะนำ:</strong> ${data.advice}</p>
                </div>

                <h5 class="text-lg font-bold mb-2 text-green-700">🌿 สมุนไพรที่แนะนำ</h5>
            `;

            if (data.herbs && data.herbs.length > 0) {
                data.herbs.forEach(herb => {
                    htmlContent += `
                        <div class="mb-2 p-3 border border-green-100 rounded bg-white">
                            • ${herb}
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
