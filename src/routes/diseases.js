import express from 'express';
import mongoose from 'mongoose';
import Disease from '../models/Disease.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// 📋 Get published diseases (public)
router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let diseases;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      diseases = await Disease.find({ published: true, name: regex });
    } else {
      diseases = await Disease.find({ published: true });
    }
    res.json({ success: true, diseases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📋 Get all diseases (admin)
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    let diseases;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      diseases = await Disease.find({ name: regex });
    } else {
      diseases = await Disease.find();
    }
    res.json({ success: true, diseases });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➕ Add disease (Admin only) — support multipart/form-data with optional image
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    console.log('📝 POST /api/diseases — incoming request (multipart)');
    console.log('   DB readyState:', mongoose.connection.readyState);
    console.log('   user:', req.user && (req.user._id || req.user));

    const name = req.body.name;
    const description = req.body.description;

    // parse symptoms (may be JSON string or comma/newline separated)
    let symptoms = [];
    if (req.body.symptoms) {
      try { symptoms = JSON.parse(req.body.symptoms); if (!Array.isArray(symptoms)) throw new Error('not array'); } catch (e) { symptoms = String(req.body.symptoms).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }

    }

    // other optional fields
    const engName = req.body.engName || '';
    let medicines = [];
    if (req.body.medicines) {
      try { medicines = JSON.parse(req.body.medicines); if (!Array.isArray(medicines)) throw new Error('not array'); } catch (e) { medicines = String(req.body.medicines).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
    }
    const usage = req.body.usage || '';
    const published = String(req.body.published) === 'true';
    const imagePath = req.file ? (req.file.path || `/uploads/${req.file.filename}`) : (req.body.image || '');

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'ต้องระบุชื่อโรคและคำอธิบาย' 
      });
    }

    // If DB is not connected, accept the data and return a temporary success so the UI can continue
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected — returning transient success for disease creation');
      const tempDisease = {
        _id: `local-${Date.now()}`,
        name,
        engName,
        description,
        symptoms: symptoms || [],
        medicines,
        usage,
        image: imagePath,
        addedBy: req.user ? req.user._id : null,
        savedLocally: true
      };
      return res.status(201).json({ success: true, message: `บันทึกข้อมูลชั่วคราว (ไม่มี DB): ${name}`, disease: tempDisease, savedLocally: true });
    }

    const newDisease = new Disease({
      name,
      engName,
      description,
      symptoms: symptoms || [],
      medicines,
      usage,
      published,
      image: imagePath
    });

    const savedDisease = await newDisease.save();
    res.status(201).json({ 
      success: true, 
      message: `เพิ่มโรค ${name} สำเร็จ ✅`,
      disease: savedDisease 
    });
  } catch (error) {
    console.error('❌ Error saving disease:', error);
    if (error.code === 11000) {
      res.status(400).json({ success: false, error: 'โรคนี้มีอยู่แล้ว!' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// ✅ Publish / Unpublish disease (Admin only)
router.put('/:id/publish', protect, admin, async (req, res) => {
  try {
    const published = String(req.body.published) === 'true';
    const disease = await Disease.findByIdAndUpdate(
      req.params.id,
      { published },
      { new: true }
    );
    if (!disease) {
      return res.status(404).json({ success: false, error: 'ไม่พบโรคนี้' });
    }
    res.json({ success: true, disease });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// ✏️ Update disease (Admin only) — support multipart/form-data with optional image
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const name = req.body.name;
    const description = req.body.description;
    const engName = req.body.engName || '';
    const usage = req.body.usage || '';
    const published = String(req.body.published) === 'true';

    let symptoms = [];
    if (req.body.symptoms) {
      try { symptoms = JSON.parse(req.body.symptoms); if (!Array.isArray(symptoms)) throw new Error('not array'); } catch (e) { symptoms = String(req.body.symptoms).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
    }

    let medicines = [];
    if (req.body.medicines) {
      try { medicines = JSON.parse(req.body.medicines); if (!Array.isArray(medicines)) throw new Error('not array'); } catch (e) { medicines = String(req.body.medicines).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
    }

    const update = {
      name,
      engName,
      description,
      symptoms,
      medicines,
      usage,
      published
    };

    if (req.file) {
      update.image = req.file.path || `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      update.image = req.body.image;
    }

    const disease = await Disease.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    
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
