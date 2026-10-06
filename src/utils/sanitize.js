const sanitizeHtml = require('sanitize-html');

const STRIP_ALL_TAGS = Object.freeze({
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
});

const UNSANITIZED_KEYS = new Set(['password']);

function stripTags(text) {
  return sanitizeHtml(text, STRIP_ALL_TAGS);
}

function sanitizeValue(value, key) {
  if (UNSANITIZED_KEYS.has(key)) {
    return value;
  }
  if (typeof value === 'string') {
    return stripTags(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)]),
    );
  }
  return value;
}

module.exports = { stripTags, sanitizeValue };
