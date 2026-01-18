import express from 'express';
import Disease from '../models/Disease.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// 📋 Get all diseases
router.get('/', async (req, res) => {
  try {
    const diseases = await Disease.find();
    res.json({ success: true, diseases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➕ Add disease (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, symptoms } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'ต้องระบุชื่อโรคและคำอธิบาย' 
      });
    }

    const newDisease = new Disease({
      name,
      description,
      symptoms: symptoms || []
    });

    const savedDisease = await newDisease.save();
    res.status(201).json({ 
      success: true, 
      message: `เพิ่มโรค ${name} สำเร็จ ✅`,
      disease: savedDisease 
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'โรคนี้มีอยู่แล้ว!' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 🔍 Get single disease
router.get('/:id', async (req, res) => {
  try {
    const disease = await Disease.findById(req.params.id);
    if (!disease) {
      return res.status(404).json({ success: false, error: 'ไม่พบโรคนี้' });
    }
    res.json({ success: true, disease });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✏️ Update disease (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, description, symptoms } = req.body;
    const disease = await Disease.findByIdAndUpdate(
      req.params.id,
      { name, description, symptoms },
      { new: true, runValidators: true }
    );
    
    if (!disease) {
      return res.status(404).json({ success: false, error: 'ไม่พบโรคนี้' });
    }
    
    res.json({ success: true, message: 'อัปเดตสำเร็จ ✅', disease });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🗑️ Delete disease (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const disease = await Disease.findByIdAndDelete(req.params.id);
    if (!disease) {
      return res.status(404).json({ success: false, error: 'ไม่พบโรคนี้' });
    }
    res.json({ success: true, message: 'ลบสำเร็จ ✅' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
