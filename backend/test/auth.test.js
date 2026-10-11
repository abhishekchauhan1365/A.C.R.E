const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const db = require('../db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-only-not-for-production';
const app = require('../server');

let server;
test.before(() => new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); }));
test.after(() => new Promise(resolve => server.close(resolve)));

function request(path, { method = 'GET', body, token } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), ...(token ? { authorization: `Bearer ${token}` } : {}) } }, res => {
      let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} }));
    });
    req.on('error', reject); req.end(payload);
  });
}

test('signup, login, and protected dashboard overview work together', async () => {
  const email = `test-${Date.now()}@example.test`;
  try {
    const signup = await request('/api/auth/signup', { method: 'POST', body: { name: 'Test User', email, password: 'strong-password' } });
    assert.equal(signup.status, 201);
    assert.ok(signup.body.token);

    const login = await request('/api/auth/login', { method: 'POST', body: { email, password: 'strong-password' } });
    assert.equal(login.status, 200);
    const denied = await request('/api/v1/overview');
    assert.equal(denied.status, 401);
    const overview = await request('/api/v1/overview', { token: login.body.token });
    assert.equal(overview.status, 200);
    assert.equal(typeof overview.body.configured, 'boolean');
  } finally {
    db.prepare('DELETE FROM users WHERE email = ?').run(email);
  }
});
