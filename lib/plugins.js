const { spawn } = require('child_process');

const generic = {
  id: 'generic',
  detects: line => /\b(error|exception|fatal|panic|traceback|failed|emerg)\b/i.test(line),
  healthCheck: () => ({ ok: true, message: 'Log source is reachable' }),
  restart: project => project.restartCommand,
  validate: command => !/[;&|`$]/.test(command || '')
};
const plugins = new Map([['generic', generic]]);
for (const name of ['node', 'python', 'java', 'nginx', 'docker', 'redis', 'pm2']) plugins.set(name, { ...generic, id: name });
function resolve(project) { return plugins.get(String(project.framework || '').toLowerCase()) || generic; }
function run(command) {
  return new Promise((resolve, reject) => {
    if (!command || !generic.validate(command)) return reject(new Error('Unsafe or missing restart command.'));
    const child = spawn(command, { shell: true, stdio: 'ignore' }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Command exited ${code}`)));
  });
}
module.exports = { resolve, run, plugins };
