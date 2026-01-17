
// This script handles chart creation for the admin dashboard.
// It requires Chart.js to be included in the HTML.

document.addEventListener('DOMContentLoaded', () => {
    console.log('Analysis.js loaded!');

    // Wait a bit for Chart.js to be ready (if loaded asynchronously)
    setTimeout(() => {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Make sure to include it in your HTML file.');
            return;
        }
        
        renderSalesChart();
        renderCategoryChart();

    }, 100);


    // --- Render Monthly Sales Bar Chart ---
    function renderSalesChart() {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.'],
                datasets: [{
                    label: 'ยอดขาย (บาท)',
                    data: [12000, 19000, 15000, 25000, 22000, 31000], // Mock data
                    backgroundColor: 'rgba(22, 163, 74, 0.7)', // green-700 with opacity
                    borderColor: 'rgba(21, 128, 61, 1)', // green-800
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'สรุปยอดขาย 6 เดือนล่าสุด',
                        font: { size: 18, family: 'Sarabun' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('th-TH') + ' ฿';
                            }
                        }
                    }
                }
            }
        });
    }

    // --- Render Product Category Doughnut Chart ---
    function renderCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['เซรั่ม', 'ครีม', 'ทำความสะอาด', 'โทนเนอร์'],
                datasets: [{
                    label: 'สัดส่วนสินค้า',
                    data: [45, 25, 20, 10], // Mock data
                    backgroundColor: [
                        '#16a34a', // green-600
                        '#65a30d', // lime-600
                        '#f97316', // orange-500
                        '#2dd4bf'  // teal-400
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'สัดส่วนสินค้าตามหมวดหมู่',
                        font: { size: 18, family: 'Sarabun' }
                    }
                }
            }
        });
    }
});

