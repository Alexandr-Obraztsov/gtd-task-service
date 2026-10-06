const { emptyObject } = require('../validators/common');
const { RUSSIAN_MESSAGES } = require('../validators/messages');
const { ValidationError } = require('../utils/errors');
const { SECURITY_EVENTS, reportSuspiciousRequest } = require('../utils/securityEvents');

const REQUEST_SOURCES = Object.freeze(['params', 'query', 'body']);

const JOI_OPTIONS = Object.freeze({
  abortEarly: false,
  convert: true,
  allowUnknown: false,
  messages: RUSSIAN_MESSAGES,
  errors: { wrap: { label: '"' } },
});

function toDetails(source, joiError) {
  return joiError.details.map((detail) => ({
    location: source,
    field: detail.path.join('.') || source,
    message: detail.message,
    type: detail.type,
  }));
}

function reportUnknownBodyFields(req, details) {
  const unknownFields = details
    .filter((detail) => detail.location === 'body' && detail.type === 'object.unknown')
    .map((detail) => detail.field);
  if (unknownFields.length) {
    reportSuspiciousRequest(SECURITY_EVENTS.MASS_ASSIGNMENT_ATTEMPT, req, { fields: unknownFields });
  }
}

function validate(schemas = {}) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const source of REQUEST_SOURCES) {
      const schema = schemas[source] || emptyObject;
      const { value, error } = schema.validate(req[source] ?? {}, JOI_OPTIONS);
      if (error) {
        details.push(...toDetails(source, error));
      }
      validated[source] = value;
    }

    if (details.length) {
      reportUnknownBodyFields(req, details);
      throw new ValidationError('Некорректные данные запроса', details.map(({ type, ...rest }) => rest));
    }

    req.validated = validated;
    next();
  };
}

module.exports = validate;
