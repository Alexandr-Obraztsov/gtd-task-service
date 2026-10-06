const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const contextRoutes = require('./context.routes');
const taskRoutes = require('./task.routes');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contexts', contextRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
