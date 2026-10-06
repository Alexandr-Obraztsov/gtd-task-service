const userService = require('../services/user.service');

async function list(req, res) {
  res.status(200).json(await userService.listUsers(req.validated.query));
}

async function getOne(req, res) {
  res.status(200).json(await userService.findUserOrFail(req.validated.params.id));
}

async function changeRole(req, res) {
  const { params, body } = req.validated;
  res.status(200).json(await userService.changeUserRole(req.actor, params.id, body.role));
}

async function remove(req, res) {
  await userService.deleteUser(req.actor, req.validated.params.id);
  res.status(204).send();
}

module.exports = { list, getOne, changeRole, remove };
