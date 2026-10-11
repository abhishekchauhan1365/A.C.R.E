const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getConfig, getState, saveState } = require('./config-store');
const { WebSocketServer } = require('ws');
const { proposePatch } = require('./ai-engine');
const patchEngine = require('./patch-engine');

let wss = null;

function safeConfig(config) {
  return { configured: config.configured, projects: config.projects, settings: { autoFix: config.settings?.autoFix || false, aiModel: config.settings?.aiModel || '', notifications: Object.fromEntries(Object.entries(config.settings?.notifications || {}).map(([key, value]) => [key, Boolean(value)])) } };
}
function send(req, res, status, body) { const origin = req.headers.origin || ''; const allowOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : 'http://localhost:8000'; res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': allowOrigin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 1024 * 1024) reject(new Error('Request too large.')); }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('Invalid JSON.')); } }); req.on('error', reject); }); }
function findIncident(id) { const state = getState(); const incident = state.incidents.find(item => item.id === id); if (!incident) throw new Error('Incident not found.'); const config = getConfig(); const project = config.projects.find(item => item.id === incident.projectId); if (!project) throw new Error('The incident project is no longer configured.'); return { state, incident, config, project }; }
function saveEvent(state, event) { state.events.unshift({ at: new Date().toISOString(), ...event }); state.events = state.events.slice(0, 500); }
function startControlServer(port = Number(process.env.ACRE_CONTROL_PORT || 4310)) {
  const dashboardDist = path.join(__dirname, '..', 'frontend', 'dist');
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return send(req, res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === 'GET' && url.pathname === '/api/v1/overview') {
      const state = getState(); return send(req, res, 200, { ...safeConfig(getConfig()), daemon: { pid: state.pid, startedAt: state.startedAt, uptimeSeconds: state.startedAt ? Math.floor((Date.now() - Date.parse(state.startedAt)) / 1000) : 0 }, incidents: state.incidents.slice(0, 20), events: state.events.slice(0, 50), system: { hostname: os.hostname(), platform: os.platform(), cpuCount: os.cpus().length, memory: { total: os.totalmem(), free: os.freemem() }, process: process.memoryUsage() } });
    }
    const approved = url.pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approved) {
      const state = getState(); const incident = state.incidents.find(item => item.id === approved[1]);
      if (!incident) return send(req, res, 404, { error: 'Incident not found.' });
      incident.status = 'approved'; incident.approvedAt = new Date().toISOString(); state.events.unshift({ at: incident.approvedAt, type: 'plan-approved', project: incident.project, message: 'Remediation plan approved for manual application.' }); saveState(state);
      return send(req, res, 200, { incident, message: 'Plan approved. Source-code changes still require explicit patch application.' });
    }
    const patchRequest = url.pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/patch$/);
    if (req.method === 'POST' && patchRequest) {
      return readBody(req).then(async () => {
        const { state, incident, config, project } = findIncident(patchRequest[1]);
        if (!project.projectRoot) project.projectRoot = patchEngine.projectRoot(project);
        const proposal = await proposePatch({ project, incident, config });
        if (!proposal.changes.length) return send(req, res, 422, { error: proposal.summary || 'No safe patch could be generated.' });
        const checked = patchEngine.preview(project, proposal.changes);
        incident.patch = { ...proposal, changes: checked.changes, generatedAt: new Date().toISOString(), status: 'proposed' };
        saveEvent(state, { type: 'patch-proposed', project: project.name, message: proposal.summary }); saveState(state);
        return send(req, res, 200, { patch: incident.patch });
      }).catch(error => send(req, res, 422, { error: error.message }));
    }
    const applyPatch = url.pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/apply-patch$/);
    if (req.method === 'POST' && applyPatch) {
      return readBody(req).then(async () => {
        const { state, incident, project } = findIncident(applyPatch[1]);
        if (!incident.patch || incident.patch.status !== 'proposed') throw new Error('Generate and review a patch before applying it.');
        if (incident.risk === 'high') throw new Error('High-risk changes cannot be applied by A.C.R.E.');
        const result = await patchEngine.apply(project, incident.patch.changes);
        incident.patch.status = result.validation.status === 'failed' ? 'applied-validation-failed' : 'applied'; incident.patch.appliedAt = new Date().toISOString(); incident.patch.backupRoot = result.backupRoot; incident.status = 'patched';
        saveEvent(state, { type: 'patch-applied', project: project.name, message: `Patch applied. Validation: ${result.validation.status}.` }); saveState(state);
        return send(req, res, 200, { incident, result });
      }).catch(error => send(req, res, 422, { error: error.message }));
    }
    const rollbackPatch = url.pathname.match(/^\/api\/v1\/incidents\/([^/]+)\/rollback-patch$/);
    if (req.method === 'POST' && rollbackPatch) {
      return readBody(req).then(() => {
        const { state, incident, project } = findIncident(rollbackPatch[1]);
        if (!incident.patch?.backupRoot || !String(incident.patch.status).startsWith('applied')) throw new Error('No applied patch is available to roll back.');
        const result = patchEngine.rollback(project, incident.patch.changes, incident.patch.backupRoot);
        incident.patch.status = 'rolled-back'; incident.status = 'open'; saveEvent(state, { type: 'patch-rolled-back', project: project.name, message: 'Applied patch restored from local backup.' }); saveState(state);
        return send(req, res, 200, { incident, result });
      }).catch(error => send(req, res, 422, { error: error.message }));
    }
    const projectPolicy = url.pathname.match(/^\/api\/v1\/projects\/([^/]+)\/policy$/);
    if (req.method === 'POST' && projectPolicy) {
      return readBody(req).then(body => {
        const config = getConfig(); const project = config.projects.find(item => item.id === projectPolicy[1]); if (!project) throw new Error('Project not found.');
        project.autoFix = Boolean(body.autoFix); project.allowCodePatches = Boolean(body.allowCodePatches); if (typeof body.projectRoot === 'string' && body.projectRoot) project.projectRoot = patchEngine.projectRoot({ ...project, projectRoot: body.projectRoot });
        require('./config-store').saveConfig(config); return send(req, res, 200, { project });
      }).catch(error => send(req, res, 422, { error: error.message }));
    }
    if (req.method === 'GET') {
      const requested = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const candidate = path.resolve(dashboardDist, requested);
      if (candidate.startsWith(path.resolve(dashboardDist)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const contentType = candidate.endsWith('.html') ? 'text/html' : candidate.endsWith('.js') ? 'application/javascript' : candidate.endsWith('.css') ? 'text/css' : 'application/octet-stream';
        res.writeHead(200, { 'content-type': contentType }); return fs.createReadStream(candidate).pipe(res);
      }
      const index = path.join(dashboardDist, 'index.html');
      if (fs.existsSync(index)) { res.writeHead(200, { 'content-type': 'text/html' }); return fs.createReadStream(index).pipe(res); }
    }
    send(req, res, 404, { error: 'Not found.' });
  });
  server.listen(port, '127.0.0.1');
  
  wss = new WebSocketServer({ server, path: '/api/v1/stream' });
  wss.on('connection', ws => {
    ws.isAlive = true;
    ws.on('pong', () => ws.isAlive = true);
  });
  
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on('close', () => clearInterval(interval));

  return server;
}

function broadcastLog(projectId, lines) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'log', projectId, lines });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

module.exports = { startControlServer, broadcastLog };
