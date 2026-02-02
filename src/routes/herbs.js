import express from 'express';
import Herb from '../models/Herb.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// 📋 Get all herbs (support optional ?q=search)
router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let herbs;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      herbs = await Herb.find({ $or: [{ name: regex }, { scientificName: regex }] });
    } else {
      herbs = await Herb.find();
    }
    res.json({ success: true, herbs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➕ Add herb (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, scientificName, description, properties, usage } = req.body;

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'ต้องระบุชื่อสมุนไพรและคำอธิบาย' 
      });
    }

    const newHerb = new Herb({
      name,
      scientificName: scientificName || '',
      description,
      properties: properties || [],
      usage: usage || '',
      addedBy: req.user._id
    });

    const savedHerb = await newHerb.save();
    res.status(201).json({ 
      success: true, 
      message: `เพิ่มสมุนไพร ${name} สำเร็จ ✅`,
      herb: savedHerb 
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'สมุนไพรนี้มีอยู่แล้ว!' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// 🔍 Get single herb
router.get('/:id', async (req, res) => {
  try {
    const herb = await Herb.findById(req.params.id);
    if (!herb) {
      return res.status(404).json({ success: false, error: 'ไม่พบสมุนไพรนี้' });
    }
    res.json({ success: true, herb });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✏️ Update herb (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, scientificName, description, properties, usage } = req.body;
    const herb = await Herb.findByIdAndUpdate(
      req.params.id,
      { name, scientificName, description, properties, usage },
      { new: true, runValidators: true }
    );
    
    if (!herb) {
      return res.status(404).json({ success: false, error: 'ไม่พบสมุนไพรนี้' });
    }
    
    res.json({ success: true, message: 'อัปเดตสำเร็จ ✅', herb });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🗑️ Delete herb (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const herb = await Herb.findByIdAndDelete(req.params.id);
    if (!herb) {
      return res.status(404).json({ success: false, error: 'ไม่พบสมุนไพรนี้' });
    }
    res.json({ success: true, message: 'ลบสำเร็จ ✅' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
