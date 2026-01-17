import express from 'express';
const router = express.Router();

// Route หลักของ admin
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Admin route is active',
    endpoints: ['/api/admin/users', '/api/admin/stats']
  });
});

// ข้อมูลผู้ใช้ (จำลอง)
router.get('/users', (req, res) => {
  res.json({
    success: true,
    users: [
      { id: 1, name: 'Admin One' },
      { id: 2, name: 'User Two' }
    ]
  });
});

// สถิติระบบ (จำลอง)
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      herbs: 42,
      diseases: 15,
      users: 128
    }
  });
});

export default router;
