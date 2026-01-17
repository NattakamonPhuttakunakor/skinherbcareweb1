import Herb from '../models/Herb.js';

// @desc    Fetch all herbs
// @route   GET /api/herbs
// @access  Public
export const getHerbs = async (req, res) => {
  try {
    const herbs = await Herb.find({}).populate('addedBy', 'firstName lastName');
    res.json({ success: true, count: herbs.length, data: herbs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a herb
// @route   POST /api/herbs
// @access  Private/Admin
export const createHerb = async (req, res) => {
  const { name, scientificName, description, properties, usage } = req.body;
  
  try {
    const herb = new Herb({
      name,
      scientificName,
      description,
      properties,
      usage,
      addedBy: req.user._id, // from 'protect' middleware
      image: req.file ? `/${req.file.path.replace(/\\/g, "/")}` : undefined // Handle uploaded file
    });

    const createdHerb = await herb.save();
    res.status(201).json({ success: true, data: createdHerb });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
