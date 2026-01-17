import Disease from '../models/Disease.js';

// @desc    Get all diseases
// @route   GET /api/diseases
// @access  Public
export const getDiseases = async (req, res) => {
  try {
    const diseases = await Disease.find({});
    res.json({ success: true, count: diseases.length, data: diseases });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a disease
// @route   POST /api/diseases
// @access  Private/Admin
export const createDisease = async (req, res) => {
  const { name, description, symptoms } = req.body;
  try {
    const disease = new Disease({ name, description, symptoms });
    const createdDisease = await disease.save();
    res.status(201).json({ success: true, data: createdDisease });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
