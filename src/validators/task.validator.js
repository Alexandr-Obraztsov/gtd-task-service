const Joi = require('joi');
const { TASK_STATUS_VALUES } = require('../utils/taskStatus');
const { id, idParams, pagination } = require('./common');

const title = Joi.string().trim().min(1).max(200);
const notes = Joi.string().trim().max(2000).allow('');
const status = Joi.string().valid(...TASK_STATUS_VALUES);
const boundedDate = Joi.date().iso().min('2000-01-01T00:00:00Z').max('2100-12-31T23:59:59Z');
const isoDate = boundedDate.allow(null);
const contextId = id.allow(null);

const list = {
  query: Joi.object({
    status,
    contextId,
    ownerId: id,
    dueBefore: boundedDate,
    ...pagination,
  }),
};

const dueReminders = {
  query: Joi.object({ ...pagination }),
};

const getOne = {
  params: idParams,
};

const create = {
  body: Joi.object({
    title: title.required(),
    notes,
    status,
    dueDate: isoDate,
    remindAt: isoDate,
    contextId,
  }),
};

const update = {
  params: idParams,
  body: Joi.object({
    title,
    notes,
    status,
    dueDate: isoDate,
    remindAt: isoDate,
    contextId,
  }).min(1),
};

module.exports = { list, dueReminders, getOne, create, update, remove: getOne };
