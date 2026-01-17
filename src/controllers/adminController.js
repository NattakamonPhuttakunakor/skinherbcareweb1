import User from '../models/User.js';
import Herb from '../models/Herb.js';
import Disease from '../models/Disease.js';

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const herbCount = await Herb.countDocuments();
    const diseaseCount = await Disease.countDocuments();
    // In a real app, you would also count orders, etc.

    res.status(200).json({
      success: true,
      data: {
        users: userCount,
        products: herbCount, // Renamed to products to match frontend
        diseases: diseaseCount,
        orders: 0 // Placeholder for orders
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
