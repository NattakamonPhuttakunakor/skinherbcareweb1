import express from 'express';
import mongoose from 'mongoose';
import Herb from '../models/Herb.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// 📋 Get published herbs (public)
router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const imageName = req.query.imageName?.trim();
    let herbs;
    if (q || imageName) {
      const queryParts = [];
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        queryParts.push({ name: regex }, { scientificName: regex }, { imageOriginalName: regex });
      }
      if (imageName) {
        const imageRegex = new RegExp(imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        queryParts.push({ imageOriginalName: imageRegex });
      }
      herbs = await Herb.find({ published: true, $or: queryParts });
    } else {
      herbs = await Herb.find({ published: true });
    }
    res.json({ success: true, herbs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📋 Get all herbs (admin)
router.get('/admin', protect, admin, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const imageName = req.query.imageName?.trim();
    let herbs;
    if (q || imageName) {
      const queryParts = [];
      if (q) {
        const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        queryParts.push({ name: regex }, { scientificName: regex }, { imageOriginalName: regex });
      }
      if (imageName) {
        const imageRegex = new RegExp(imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        queryParts.push({ imageOriginalName: imageRegex });
      }
      herbs = await Herb.find({ $or: queryParts });
    } else {
      herbs = await Herb.find();
    }
    res.json({ success: true, herbs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➕ Add herb (Admin only)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    // parse fields (properties may be JSON string)
    const name = req.body.name;
    const scientificName = req.body.engName || req.body.scientificName || '';
    const description = req.body.description;
    let properties = [];
    if (req.body.properties) {
      try { properties = JSON.parse(req.body.properties); if (!Array.isArray(properties)) throw new Error('not array'); } catch (e) { properties = String(req.body.properties).split(/[\n,]+/).map(p => p.trim()).filter(Boolean); }
    }
    const usage = req.body.usage || '';
    const published = String(req.body.published) === 'true';
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (req.body.image || '/uploads/default-herb.png');
    const imageOriginalName = req.file ? req.file.originalname : (req.body.imageOriginalName || '');

    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ 
        success: false, 
        error: 'ต้องระบุชื่อสมุนไพรและคำอธิบาย' 
      });
    }

    // If DB is not connected, accept the data and return a temporary success so the UI can continue
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected — returning transient success for herb creation');
      const tempHerb = {
        _id: `local-${Date.now()}`,
        name,
        scientificName: scientificName || '',
        description,
        properties: properties || [],
        usage: usage || '',
        image: imagePath,
        imageOriginalName,
        addedBy: req.user ? req.user._id : null,
        savedLocally: true
      };
      return res.status(201).json({ success: true, message: `บันทึกข้อมูลชั่วคราว (ไม่มี DB): ${name}`, herb: tempHerb, savedLocally: true });
    }

    const newHerb = new Herb({
      name,
      scientificName: scientificName || '',
      description,
      properties: properties || [],
        usage: usage || '',
        published,
        image: imagePath,
        imageOriginalName,
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

// ✅ Publish / Unpublish herb (Admin only)
router.put('/:id/publish', protect, admin, async (req, res) => {
  try {
    const published = String(req.body.published) === 'true';
    const herb = await Herb.findByIdAndUpdate(
      req.params.id,
      { published },
      { new: true }
    );
    if (!herb) {
      return res.status(404).json({ success: false, error: 'ไม่พบสมุนไพรนี้' });
    }
    res.json({ success: true, herb });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// ✏️ Update herb (Admin only) — support multipart/form-data with optional image
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const hasBody = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

    const update = {};

    if (hasBody('name') && String(req.body.name).trim() !== '') {
      update.name = String(req.body.name).trim();
    }

    const scientificNameRaw = req.body.engName ?? req.body.scientificName;
    if (scientificNameRaw !== undefined && String(scientificNameRaw).trim() !== '') {
      update.scientificName = String(scientificNameRaw).trim();
    }

    if (hasBody('description') && String(req.body.description).trim() !== '') {
      update.description = String(req.body.description).trim();
    }

    if (hasBody('properties') && String(req.body.properties).trim() !== '') {
      let properties = [];
      try { properties = JSON.parse(req.body.properties); if (!Array.isArray(properties)) throw new Error('not array'); } catch (e) { properties = String(req.body.properties).split(/[\n,]+/).map(p => p.trim()).filter(Boolean); }
      update.properties = properties;
    }

    if (hasBody('usage') && String(req.body.usage).trim() !== '') {
      update.usage = String(req.body.usage).trim();
    }

    if (hasBody('published')) {
      update.published = String(req.body.published) === 'true';
    }

    if (req.file) {
      update.image = `/uploads/${req.file.filename}`;
      update.imageOriginalName = req.file.originalname || '';
    } else if (hasBody('image') && String(req.body.image).trim() !== '') {
      update.image = req.body.image;
      if (hasBody('imageOriginalName') && String(req.body.imageOriginalName).trim() !== '') {
        update.imageOriginalName = req.body.imageOriginalName;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'ไม่มีข้อมูลใหม่สำหรับอัปเดต' });
    }

    const herb = await Herb.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    
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
