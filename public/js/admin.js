// This script is specifically for the admin-dashboard.html page

document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin.js loaded!');

    // --- Fetch and Display Summary Data ---
    const fetchDashboardStats = async () => {
        try {
            // We created this API endpoint in server.js earlier
            const response = await fetch('/api/admin/dashboard');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            // Update the UI with the fetched data
            updateStatCard('total-users', data.data.users);
            updateStatCard('total-products', data.data.products);
            updateStatCard('total-orders', data.data.orders);

        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            // Display error values in UI
            updateStatCard('total-users', 'Error');
            updateStatCard('total-products', 'Error');
            updateStatCard('total-orders', 'Error');
        }
    };

    /**
     * Helper function to update a single statistic card.
     * @param {string} elementId - The ID of the element to update.
     * @param {string|number} value - The new value to display.
     */
    const updateStatCard = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with ID '${elementId}' not found.`);
        }
    };

    // --- Fetch and Display Recent Products (Mockup) ---
    const displayRecentProducts = () => {
        // In a real app, this data would come from an API call
        const mockProducts = [
            { id: 'P001', name: 'เซรั่มขมิ้นทองคำ', category: 'เซรั่ม', stock: 150 },
            { id: 'P002', name: 'ครีมกันแดดใบบัวบก', category: 'ครีม', stock: 85 },
            { id: 'P003', name: 'สบู่สครับกาแฟ', category: 'ทำความสะอาด', stock: 210 },
            { id: 'P004', name: 'โทนเนอร์มะหาด', category: 'โทนเนอร์', stock: 120 },
        ];

        const productTableBody = document.getElementById('product-table-body');
        if (!productTableBody) return;

        productTableBody.innerHTML = ''; // Clear existing rows

        mockProducts.forEach(product => {
            const row = `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-mono text-sm">${product.id}</td>
                    <td class="p-3 font-semibold">${product.name}</td>
                    <td class="p-3">${product.category}</td>
                    <td class="p-3 text-center">${product.stock}</td>
                    <td class="p-3 text-center">
                        <button class="text-blue-500 hover:text-blue-700 mx-1">แก้ไข</button>
                        <button class="text-red-500 hover:text-red-700 mx-1">ลบ</button>
                    </td>
                </tr>
            `;
            productTableBody.innerHTML += row;
        });
    };


    // Initial calls to populate the dashboard
    fetchDashboardStats();
    displayRecentProducts();
});
