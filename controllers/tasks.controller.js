const tasksModel = require('../models/tasks.model');

const ALLOWED_CONTEXTS = ['@home', '@work', '@calls', '@errands', '@computer'];
const ALLOWED_STATUSES = ['inbox', 'next', 'waiting', 'someday', 'done'];

function validateTaskInput(body) {
  const errors = [];

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('Поле "title" обязательно и должно быть непустой строкой');
  }
  if (!body.context || !ALLOWED_CONTEXTS.includes(body.context)) {
    errors.push(`Поле "context" обязательно и должно быть одним из: ${ALLOWED_CONTEXTS.join(', ')}`);
  }
  if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
    errors.push(`Поле "status" должно быть одним из: ${ALLOWED_STATUSES.join(', ')}`);
  }

  return errors;
}

function list(req, res) {
  let result = tasksModel.getAll();

  const { context, status } = req.query;
  if (context) {
    result = result.filter((task) => task.context === context);
  }
  if (status) {
    result = result.filter((task) => task.status === status);
  }

  res.status(200).json(result);
}

function getOne(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Параметр id должен быть числом' });
  }

  const task = tasksModel.getById(id);
  if (!task) {
    return res.status(404).json({ error: `Задача с id=${id} не найдена` });
  }
  res.status(200).json(task);
}

function create(req, res) {
  const errors = validateTaskInput(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Некорректные данные запроса', details: errors });
  }

  const task = tasksModel.create(req.body);
  res.status(201).json(task);
}

function update(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Параметр id должен быть числом' });
  }

  if (!tasksModel.getById(id)) {
    return res.status(404).json({ error: `Задача с id=${id} не найдена` });
  }

  const errors = validateTaskInput(req.body);
  if (errors.length) {
    return res.status(400).json({ error: 'Некорректные данные запроса', details: errors });
  }

  const task = tasksModel.update(id, req.body);
  res.status(200).json(task);
}

function remove(req, res) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Параметр id должен быть числом' });
  }

  const removed = tasksModel.remove(id);
  if (!removed) {
    return res.status(404).json({ error: `Задача с id=${id} не найдена` });
  }
  res.status(204).send();
}

module.exports = { list, getOne, create, update, remove, ALLOWED_CONTEXTS, ALLOWED_STATUSES };
