const TASK_STATUS = Object.freeze({
  INBOX: 'inbox',
  NEXT: 'next',
  WAITING: 'waiting',
  SCHEDULED: 'scheduled',
  SOMEDAY: 'someday',
  DONE: 'done',
});

const TASK_STATUS_VALUES = Object.freeze(Object.values(TASK_STATUS));

module.exports = { TASK_STATUS, TASK_STATUS_VALUES };
