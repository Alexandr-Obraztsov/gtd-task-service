const taskService = require('../services/task.service');

async function list(req, res) {
  res.status(200).json(await taskService.listTasks(req.actor, req.validated.query));
}

async function dueReminders(req, res) {
  res.status(200).json(await taskService.listDueReminders(req.actor, req.validated.query));
}

async function getOne(req, res) {
  res.status(200).json(await taskService.getTask(req.actor, req.validated.params.id));
}

async function create(req, res) {
  res.status(201).json(await taskService.createTask(req.actor, req.validated.body));
}

async function update(req, res) {
  const { params, body } = req.validated;
  res.status(200).json(await taskService.updateTask(req.actor, params.id, body));
}

async function remove(req, res) {
  await taskService.deleteTask(req.actor, req.validated.params.id);
  res.status(204).send();
}

module.exports = { list, dueReminders, getOne, create, update, remove };
