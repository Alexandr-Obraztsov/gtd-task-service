const { Router } = require('express');
const controller = require('../controllers/task.controller');
const schemas = require('../validators/task.validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.use(authenticate);

router.get('/', validate(schemas.list), controller.list);
router.post('/', validate(schemas.create), controller.create);
router.get('/reminders/due', validate(schemas.dueReminders), controller.dueReminders);
router.get('/:id', validate(schemas.getOne), controller.getOne);
router.patch('/:id', validate(schemas.update), controller.update);
router.delete('/:id', validate(schemas.remove), controller.remove);

module.exports = router;
