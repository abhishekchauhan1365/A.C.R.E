const chokidar = require('chokidar');
const fs = require('fs');
const os = require('os');
const { getConfig, getState, saveState } = require('./config-store');
const { resolve, run } = require('./plugins');
const { analyse } = require('./ai-engine');
const { startControlServer } = require('./control-server');

function addEvent(event) { const state = getState(); state.events.unshift({ at: new Date().toISOString(), ...event }); state.events = state.events.slice(0, 500); saveState(state); }
async function notify(url, text) { if (url) await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }); }
function tail(file, max = 40) { try { return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).slice(-max); } catch { return []; } }
function start({ foreground = false } = {}) {
  const config = getConfig();
  if (!config.projects.length) throw new Error('No projects registered. Run `acre-ai init` or `acre-ai add-project`.');
  const state = getState(); state.pid = process.pid; state.startedAt = new Date().toISOString(); saveState(state);
  const controlServer = startControlServer();
  const watchers = config.projects.map(project => {
    const plugin = resolve(project); let timer;
    const inspect = async () => {
      clearTimeout(timer); timer = setTimeout(async () => {
        const lines = tail(project.logPath); const last = lines.at(-1) || '';
        if (!plugin.detects(last)) return;
        const current = getConfig(); const finding = await analyse({ project, lines, config: current }).catch(error => ({ summary: error.message, action: 'Inspect the incident manually.', risk: 'medium', source: 'local' }));
        const incident = { id: `${Date.now()}-${project.id}`, projectId: project.id, project: project.name, timestamp: new Date().toISOString(), log: last, context: lines, os: os.platform(), framework: project.framework, ...finding, status: finding.risk === 'high' ? 'approval-required' : 'open' };
        const saved = getState(); saved.incidents.unshift(incident); saved.incidents = saved.incidents.slice(0, 500); saveState(saved); addEvent({ type: 'incident', project: project.name, message: finding.summary });
        const webhook = current.settings.notifications?.slack || current.settings.notifications?.discord;
        await notify(webhook, `A.C.R.E. incident (${incident.risk}) in ${project.name}: ${finding.summary}`).catch(() => {});
        if (current.settings.autoFix && finding.risk === 'low' && project.restartCommand && plugin.validate(project.restartCommand)) { await run(project.restartCommand).then(() => addEvent({ type: 'auto-fix', project: project.name, message: 'Low-risk restart completed.' })).catch(error => addEvent({ type: 'auto-fix-failed', project: project.name, message: error.message })); }
      }, 250);
    };
    const watcher = chokidar.watch(project.logPath, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } }); watcher.on('add', inspect).on('change', inspect).on('error', error => addEvent({ type: 'watch-error', project: project.name, message: error.message }));
    addEvent({ type: 'watching', project: project.name, message: project.logPath }); return watcher;
  });
  const stop = async () => { await Promise.all(watchers.map(w => w.close())); await new Promise(resolve => controlServer.close(resolve)); const state = getState(); state.pid = null; saveState(state); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop); if (foreground) console.log(`A.C.R.E. daemon watching ${watchers.length} project(s). Press Ctrl+C to stop.`); return { stop };
}
module.exports = { start };
