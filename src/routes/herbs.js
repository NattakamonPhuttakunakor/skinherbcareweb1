import express from 'express';
const router = express.Router();

// ดึงสมุนไพรทั้งหมด
router.get('/', (req, res) => {
  res.json({
    success: true,
    herbs: [
      { id: 1, name: 'ขมิ้นชัน', benefit: 'ลดการอักเสบของผิวหนัง' },
      { id: 2, name: 'ว่านหางจระเข้', benefit: 'บำรุงผิว ลดรอยไหม้แดด' },
    ],
  });
});

// เพิ่มสมุนไพรใหม่
router.post('/', (req, res) => {
  const { name, benefit } = req.body;
  res.json({ success: true, message: `เพิ่มสมุนไพร ${name} สำเร็จ` });
});

export default router;
