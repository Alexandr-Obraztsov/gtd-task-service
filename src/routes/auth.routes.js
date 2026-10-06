const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const schemas = require('../validators/auth.validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiters');

const router = Router();

router.post('/register', authLimiter, validate(schemas.register), controller.register);
router.post('/login', authLimiter, validate(schemas.login), controller.login);
router.post('/refresh', authLimiter, validate(schemas.refresh), controller.refresh);
router.post('/logout', validate(schemas.logout), controller.logout);
router.get('/me', authenticate, validate(schemas.me), controller.me);

module.exports = router;
