const test = require('node:test');
const assert = require('node:assert/strict');

const Project = require('../models/Project');
const {
  getAccessibleProjectIds,
  canAccessProject,
  requireProjectAccess,
  projectScopeFilter
} = require('../utils/accessControl');

const originalFind = Project.find;

test.afterEach(() => {
  Project.find = originalFind;
});

test('administrators are not restricted by project scope', async () => {
  const admin = { _id: 'admin-1', role: 'admin', assignedProjects: [] };

  assert.equal(await getAccessibleProjectIds(admin), null);
  assert.equal(await canAccessProject(admin, 'any-project'), true);
  assert.deepEqual(await projectScopeFilter(admin), {});
});

test('manager scope combines assigned and managed projects without duplicates', async () => {
  Project.find = () => ({ distinct: async () => ['project-2', 'project-3'] });
  const manager = {
    _id: 'manager-1',
    role: 'manager',
    assignedProjects: ['project-1', { _id: 'project-2' }]
  };

  assert.deepEqual(
    await getAccessibleProjectIds(manager),
    ['project-1', 'project-2', 'project-3']
  );
  assert.equal(await canAccessProject(manager, 'project-3'), true);
  assert.equal(await canAccessProject(manager, 'project-4'), false);
  assert.deepEqual(
    await projectScopeFilter(manager, 'projectId'),
    { projectId: { $in: ['project-1', 'project-2', 'project-3'] } }
  );
});

test('requireProjectAccess returns a controlled forbidden response', async () => {
  Project.find = () => ({ distinct: async () => [] });
  const req = {
    user: { _id: 'manager-1', role: 'manager', assignedProjects: [] }
  };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  assert.equal(await requireProjectAccess(req, res, 'project-9'), false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /not assigned/i);
});
