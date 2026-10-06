function toPage({ rows, count }, { limit, offset }) {
  return { items: rows, total: count, limit, offset };
}

module.exports = { toPage };
