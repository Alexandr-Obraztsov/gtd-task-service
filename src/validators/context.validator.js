const Joi = require('joi');
const { id, idParams, pagination } = require('./common');

const name = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^@[\p{L}\p{N}_-]+$/u, { name: 'context' })
  .messages({ 'string.pattern.name': '{{#label}} должно начинаться с @ и содержать только буквы, цифры, _ и -' });

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
  body: Joi.object({ name: name.required() }),
};

const update = {
  params: idParams,
  body: Joi.object({ name: name.required() }),
};

module.exports = { list, getOne, create, update, remove: getOne };
