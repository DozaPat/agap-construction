const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const originalFindById = User.findById;
const originalJwtSecret = process.env.JWT_SECRET;

const makeResponse = () => ({
  statusCode: 200,
  body: null,
  clearedCookies: [],
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  clearCookie(name) {
    this.clearedCookies.push(name);
    return this;
  }
});

const makeRequest = (token, overrides = {}) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
  cookies: {},
  baseUrl: '/api/projects',
  path: '/',
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  role: 'manager',
  status: 'active',
  tokenVersion: 0,
  mustChangePassword: false,
  ...overrides
});

test.beforeEach(() => {
  process.env.JWT_SECRET = 'phase-8-test-secret';
});

test.afterEach(() => {
  User.findById = originalFindById;
});

test.after(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

test('protect rejects requests without a bearer token', async () => {
  const req = makeRequest();
  const res = makeResponse();
  let called = false;

  await protect(req, res, () => { called = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test('protect accepts an active user with the current token version', async () => {
  const user = makeUser();
  User.findById = () => ({ select: async () => user });
  const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  const req = makeRequest(token);
  const res = makeResponse();
  let called = false;

  await protect(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(req.user, user);
});

test('protect rejects a revoked token version', async () => {
  const user = makeUser({ tokenVersion: 2 });
  User.findById = () => ({ select: async () => user });
  const token = jwt.sign({ id: user._id, tokenVersion: 1 }, process.env.JWT_SECRET);
  const req = makeRequest(token);
  const res = makeResponse();

  await protect(req, res, () => assert.fail('next must not be called'));

  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /session has expired/i);
});

test('protect blocks inactive accounts', async () => {
  const user = makeUser({ status: 'inactive' });
  User.findById = () => ({ select: async () => user });
  const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  const req = makeRequest(token);
  const res = makeResponse();

  await protect(req, res, () => assert.fail('next must not be called'));

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /inactive/i);
});

test('protect limits temporary-password sessions to password setup routes', async () => {
  const user = makeUser({ mustChangePassword: true });
  User.findById = () => ({ select: async () => user });
  const token = jwt.sign({ id: user._id, tokenVersion: 0 }, process.env.JWT_SECRET);
  const blockedReq = makeRequest(token);
  const blockedRes = makeResponse();

  await protect(blockedReq, blockedRes, () => assert.fail('next must not be called'));
  assert.equal(blockedRes.statusCode, 428);

  const allowedReq = makeRequest(token, { baseUrl: '/api/auth', path: '/me' });
  const allowedRes = makeResponse();
  let called = false;
  await protect(allowedReq, allowedRes, () => { called = true; });
  assert.equal(called, true);
});

test('authorize enforces admin and manager role lists', () => {
  const adminOnly = authorize('admin');
  const denied = makeResponse();
  adminOnly({ user: { role: 'manager' } }, denied, () => assert.fail('next must not be called'));
  assert.equal(denied.statusCode, 403);

  let managerAllowed = false;
  authorize('admin', 'manager')(
    { user: { role: 'manager' } },
    makeResponse(),
    () => { managerAllowed = true; }
  );
  assert.equal(managerAllowed, true);
});
