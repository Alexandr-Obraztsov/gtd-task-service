const Joi = require('joi');
const { ROLE_VALUES } = require('../utils/roles');
const { idParams, pagination } = require('./common');

const list = {
  query: Joi.object({
    role: Joi.string().valid(...ROLE_VALUES),
    ...pagination,
  }),
};

const getOne = {
  params: idParams,
};

const changeRole = {
  params: idParams,
  body: Joi.object({
    role: Joi.string().valid(...ROLE_VALUES).required(),
  }),
};

module.exports = { list, getOne, changeRole, remove: getOne };
