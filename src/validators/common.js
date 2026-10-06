const Joi = require('joi');

const MAX_INT = 2147483647;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const id = Joi.number().integer().positive().max(MAX_INT);

const idParams = Joi.object({ id: id.required() });

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254);

const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/\p{L}/u, 'хотя бы одну букву')
  .pattern(/\d/, 'хотя бы одну цифру')
  .pattern(/[^\p{L}\d\s]/u, 'хотя бы один спецсимвол');

const pagination = {
  limit: Joi.number().integer().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  offset: Joi.number().integer().min(0).max(MAX_INT).default(0),
};

const emptyObject = Joi.object({});

module.exports = { id, idParams, email, password, pagination, emptyObject };
