const { Router } = require('express');
const controller = require('../controllers/user.controller');
const schemas = require('../validators/user.validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const { ROLES } = require('../utils/roles');

const router = Router();

router.use(authenticate);

router.get('/', roleGuard(ROLES.MODERATOR), validate(schemas.list), controller.list);
router.get('/:id', roleGuard(ROLES.MODERATOR), validate(schemas.getOne), controller.getOne);
router.patch('/:id/role', roleGuard(ROLES.ADMIN), validate(schemas.changeRole), controller.changeRole);
router.delete('/:id', roleGuard(ROLES.ADMIN), validate(schemas.remove), controller.remove);

module.exports = router;
