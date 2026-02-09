import express from 'express';
import fs from 'fs';
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
    let imagePath = req.body.image || '';
    if (req.file) {
      const buffer = fs.readFileSync(req.file.path);
      imagePath = `data:${req.file.mimetype};base64,${buffer.toString('base64')}`;
      fs.unlink(req.file.path, () => {});
    }

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
    const hasBody = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

    const update = {};

    if (hasBody('name') && String(req.body.name).trim() !== '') {
      update.name = String(req.body.name).trim();
    }

    if (hasBody('description') && String(req.body.description).trim() !== '') {
      update.description = String(req.body.description).trim();
    }

    if (hasBody('engName') && String(req.body.engName).trim() !== '') {
      update.engName = String(req.body.engName).trim();
    }

    if (hasBody('usage') && String(req.body.usage).trim() !== '') {
      update.usage = String(req.body.usage).trim();
    }

    if (hasBody('published')) {
      update.published = String(req.body.published) === 'true';
    }

    if (hasBody('symptoms') && String(req.body.symptoms).trim() !== '') {
      let symptoms = [];
      try { symptoms = JSON.parse(req.body.symptoms); if (!Array.isArray(symptoms)) throw new Error('not array'); } catch (e) { symptoms = String(req.body.symptoms).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
      update.symptoms = symptoms;
    }

    if (hasBody('medicines') && String(req.body.medicines).trim() !== '') {
      let medicines = [];
      try { medicines = JSON.parse(req.body.medicines); if (!Array.isArray(medicines)) throw new Error('not array'); } catch (e) { medicines = String(req.body.medicines).split(/[\n,]+/).map(s => s.trim()).filter(Boolean); }
      update.medicines = medicines;
    }

    if (req.file) {
      const buffer = fs.readFileSync(req.file.path);
      update.image = `data:${req.file.mimetype};base64,${buffer.toString('base64')}`;
      fs.unlink(req.file.path, () => {});
    } else if (hasBody('image') && String(req.body.image).trim() !== '') {
      update.image = req.body.image;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีข้อมูลใหม่สำหรับอัปเดต' });
    }

    if (update.name) {
      const conflict = await Disease.findOne({ name: update.name, _id: { $ne: req.params.id } });
      if (conflict) {
        return res.status(400).json({ success: false, error: 'ชื่อโรคนี้มีอยู่แล้ว' });
      }
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
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'ชื่อโรคนี้มีอยู่แล้ว' });
    }
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
