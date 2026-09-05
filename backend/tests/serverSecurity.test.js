const test = require('node:test');
const assert = require('node:assert/strict');

const { app } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('API responses use security headers and do not expose Express', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { message: 'API endpoint not found' });
});

test('oversized JSON bodies are rejected before reaching a controller', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: 'x'.repeat(1024 * 1024 + 1) })
  });

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { message: 'Request body is too large' });
});
