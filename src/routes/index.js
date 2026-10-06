const { Router } = require('express');
const validate = require('../middleware/validate');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const contextRoutes = require('./context.routes');
const taskRoutes = require('./task.routes');
const docsRoutes = require('./docs.routes');

const router = Router();

router.get('/health', validate(), (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/api-docs', docsRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/contexts', contextRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
