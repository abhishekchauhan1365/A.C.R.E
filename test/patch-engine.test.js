const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { preview, apply, rollback } = require('../lib/patch-engine');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'acre-patch-'));
  fs.mkdirSync(path.join(root, 'src')); fs.writeFileSync(path.join(root, 'src', 'app.js'), 'function run() {\n  return Promise.resolve(1);\n}\n');
  return { root, project: { projectRoot: root, logPath: path.join(root, 'logs', 'app.log') }, changes: [{ path: 'src/app.js', search: 'return Promise.resolve(1);', replace: 'return Promise.resolve(1).catch(console.error);', reason: 'Handle rejected promise.' }] };
}
test('previews a single bounded source replacement', () => { const { root, project, changes } = fixture(); try { assert.equal(preview(project, changes).changes.length, 1); } finally { fs.rmSync(root, { recursive: true, force: true }); } });
test('applies a patch and creates a local backup', async () => { const { root, project, changes } = fixture(); try { const result = await apply(project, changes); assert.match(fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8'), /catch/); assert.ok(fs.existsSync(result.backupRoot)); } finally { fs.rmSync(root, { recursive: true, force: true }); } });
test('rolls back an applied patch from its local backup', async () => { const { root, project, changes } = fixture(); try { const result = await apply(project, changes); rollback(project, changes, result.backupRoot); assert.doesNotMatch(fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8'), /catch/); } finally { fs.rmSync(root, { recursive: true, force: true }); } });
test('rejects patches outside the project root', () => { const { root, project, changes } = fixture(); try { changes[0].path = '../outside.js'; assert.throws(() => preview(project, changes), /Unsafe patch path|escapes/); } finally { fs.rmSync(root, { recursive: true, force: true }); } });
