function pickDefined(source, allowedKeys) {
  return Object.fromEntries(
    allowedKeys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]),
  );
}

module.exports = { pickDefined };
