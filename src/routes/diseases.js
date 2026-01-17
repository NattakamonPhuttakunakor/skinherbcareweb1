import express from 'express';
const router = express.Router();

// แสดงโรคทั้งหมด
router.get('/', (req, res) => {
  res.json({
    success: true,
    diseases: [
      { id: 1, name: 'กลาก', symptom: 'ผื่นคันเป็นวง' },
      { id: 2, name: 'เกลื้อน', symptom: 'ผิวมีรอยด่างขาว/น้ำตาล' },
    ],
  });
});

// เพิ่มข้อมูลโรค
router.post('/', (req, res) => {
  const { name, symptom } = req.body;
  res.json({ success: true, message: `เพิ่มโรค ${name} สำเร็จ` });
});

export default router;
