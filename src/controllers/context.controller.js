const contextService = require('../services/context.service');

async function listPublic(req, res) {
  res.status(200).json(await contextService.listPublicContexts(req.validated.query));
}

async function list(req, res) {
  res.status(200).json(await contextService.listContexts(req.actor, req.validated.query));
}

async function getOne(req, res) {
  res.status(200).json(await contextService.getContext(req.actor, req.validated.params.id));
}

async function create(req, res) {
  res.status(201).json(await contextService.createContext(req.actor, req.validated.body));
}

async function update(req, res) {
  const { params, body } = req.validated;
  res.status(200).json(await contextService.updateContext(req.actor, params.id, body));
}

async function remove(req, res) {
  await contextService.deleteContext(req.actor, req.validated.params.id);
  res.status(204).send();
}

module.exports = { listPublic, list, getOne, create, update, remove };
