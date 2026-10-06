const Joi = require('joi');
const { id, idParams, pagination } = require('./common');

const name = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^@[\p{L}\p{N}_-]+$/u, { name: 'context' })
  .messages({ 'string.pattern.name': '{{#label}} должно начинаться с @ и содержать только буквы, цифры, _ и -' });

const isPublic = Joi.boolean().strict();

const listPublic = {
  query: Joi.object({ ...pagination }),
};

const list = {
  query: Joi.object({
    ownerId: id,
    ...pagination,
  }),
};

const getOne = {
  params: idParams,
};

const create = {
  body: Joi.object({ name: name.required(), isPublic }),
};

const update = {
  params: idParams,
  body: Joi.object({ name, isPublic }).min(1),
};

module.exports = { listPublic, list, getOne, create, update, remove: getOne };
