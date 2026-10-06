const { Router } = require('express');
const controller = require('../controllers/context.controller');
const schemas = require('../validators/context.validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.get('/public', validate(schemas.listPublic), controller.listPublic);

router.use(authenticate);

router.get('/', validate(schemas.list), controller.list);
router.post('/', validate(schemas.create), controller.create);
router.get('/:id', validate(schemas.getOne), controller.getOne);
router.patch('/:id', validate(schemas.update), controller.update);
router.delete('/:id', validate(schemas.remove), controller.remove);

module.exports = router;
