const express = require('express');
const tasksController = require('../controllers/tasks.controller');

const router = express.Router();

function allowCollection(req, res) {
  res.set('Allow', 'GET, POST, OPTIONS');
  res.status(204).send();
}

function allowItem(req, res) {
  res.set('Allow', 'GET, PUT, DELETE, OPTIONS');
  res.status(204).send();
}

router.get('/', tasksController.list);
router.post('/', tasksController.create);
router.options('/', allowCollection);

router.get('/:id', tasksController.getOne);
router.put('/:id', tasksController.update);
router.delete('/:id', tasksController.remove);
router.options('/:id', allowItem);

module.exports = router;
