const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const MAX_CHANGES = 3;
const MAX_TEXT = 16000;
const BLOCKED = /(^|[\\/])(node_modules|\.git|\.acre-backups)([\\/]|$)|(^|[\\/])\.env(?:\.|$)/i;

function projectRoot(project) {
  const candidate = project.projectRoot || path.dirname(path.dirname(project.logPath));
  return path.resolve(candidate);
}
function safeFile(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.includes('\0') || BLOCKED.test(relative)) throw new Error('Unsafe patch path.');
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Patch path escapes the project root.');
  if (!/\.(?:[cm]?[jt]sx?|py|java|php|rb|go|json|ya?ml)$/i.test(file)) throw new Error('Unsupported patch file type.');
  return file;
}
function validateChanges(project, changes) {
  const root = projectRoot(project);
  if (!fs.existsSync(root)) throw new Error('Project root does not exist.');
  if (!Array.isArray(changes) || !changes.length || changes.length > MAX_CHANGES) throw new Error('A patch must contain 1–3 changes.');
  return changes.map(change => {
    if (!change || typeof change.path !== 'string' || typeof change.search !== 'string' || typeof change.replace !== 'string') throw new Error('Malformed patch change.');
    if (!change.search || change.search.length > MAX_TEXT || change.replace.length > MAX_TEXT) throw new Error('Patch text is invalid or too large.');
    const file = safeFile(root, change.path);
    if (!fs.existsSync(file)) throw new Error(`Patch target does not exist: ${change.path}`);
    const source = fs.readFileSync(file, 'utf8');
    const count = source.split(change.search).length - 1;
    if (count !== 1) throw new Error(`Expected exactly one matching block in ${change.path}; found ${count}.`);
    return { path: change.path, search: change.search, replace: change.replace, reason: String(change.reason || '').slice(0, 500) };
  });
}
function preview(project, changes) { return { root: projectRoot(project), changes: validateChanges(project, changes) }; }
function copyBackup(root, file, contents) {
  const backupRoot = path.join(root, '.acre-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  const destination = path.join(backupRoot, path.relative(root, file));
  fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.writeFileSync(destination, contents, 'utf8'); return backupRoot;
}
async function runValidation(project) {
  if (!project.validateCommand) return { status: 'skipped', reason: 'No validation command configured.' };
  const command = project.validateCommand;
  if (/[;&|`$]/.test(command)) return { status: 'skipped', reason: 'Unsafe validation command rejected.' };
  return new Promise(resolve => {
    const child = spawn(command, { cwd: projectRoot(project), shell: true, windowsHide: true, stdio: 'ignore' });
    child.on('error', error => resolve({ status: 'failed', reason: error.message }));
    child.on('exit', code => resolve(code === 0 ? { status: 'passed' } : { status: 'failed', reason: `Validation exited ${code}.` }));
  });
}
async function apply(project, changes) {
  const checked = validateChanges(project, changes); const root = projectRoot(project); let backupRoot = '';
  for (const change of checked) { const file = safeFile(root, change.path); const source = fs.readFileSync(file, 'utf8'); backupRoot = copyBackup(root, file, source); fs.writeFileSync(file, source.replace(change.search, change.replace), 'utf8'); }
  const validation = await runValidation(project);
  return { backupRoot, validation, nodemon: project.restartCommand ? 'Your file watcher/nodemon should reload the changed files.' : 'No restart command is configured; restart your application if it does not have a file watcher.' };
}
function rollback(project, changes, backupRoot) {
  const root = projectRoot(project);
  if (!backupRoot || !path.resolve(backupRoot).startsWith(path.join(root, '.acre-backups'))) throw new Error('Invalid patch backup.');
  if (!Array.isArray(changes) || !changes.length || changes.length > MAX_CHANGES) throw new Error('Invalid rollback patch.');
  for (const change of changes) {
    const target = safeFile(root, change.path); const backup = path.join(backupRoot, change.path);
    if (!fs.existsSync(backup)) throw new Error(`Missing backup for ${change.path}.`);
    fs.writeFileSync(target, fs.readFileSync(backup, 'utf8'), 'utf8');
  }
  return { restored: changes.length, backupRoot };
}
module.exports = { projectRoot, preview, apply, rollback, validateChanges };
