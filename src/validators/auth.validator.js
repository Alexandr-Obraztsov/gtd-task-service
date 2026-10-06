const Joi = require('joi');
const { email, password } = require('./common');

const register = {
  body: Joi.object({
    email: email.required(),
    password: password.required(),
  }),
};

const login = {
  body: Joi.object({
    email: email.required(),
    password: Joi.string().max(72).required(),
  }),
};

const noInput = {};

module.exports = { register, login, refresh: noInput, logout: noInput, me: noInput };
