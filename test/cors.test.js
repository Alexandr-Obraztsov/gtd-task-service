const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { loadFresh } = require('./helpers');

const APP_MODULE = path.resolve(__dirname, '../src/app.js');

async function withServer(run) {
  const createApp = loadFresh(APP_MODULE);
  const server = http.createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function preflight(base, origin, method) {
  return fetch(`${base}/tasks/1`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': method,
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
}

test('preflight для PUT с разрешённого источника проходит', async () => {
  await withServer(async (base) => {
    const res = await preflight(base, 'https://gtd-client.example.app', 'PUT');
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://gtd-client.example.app');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    assert.match(res.headers.get('access-control-allow-methods'), /PUT/);
  });
});

test('preflight с чужого источника отклоняется (403)', async () => {
  await withServer(async (base) => {
    const res = await preflight(base, 'https://evil.example.com', 'PUT');
    assert.equal(res.status, 403);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});
