const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { getConfig, getState, saveState } = require('./config-store');

function safeConfig(config) {
  return { configured: config.configured, projects: config.projects, settings: { autoFix: config.settings?.autoFix || false, aiModel: config.settings?.aiModel || '', notifications: Object.fromEntries(Object.entries(config.settings?.notifications || {}).map(([key, value]) => [key, Boolean(value)])) } };
}
function send(req, res, status, body) { const origin = req.headers.origin || ''; const allowOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ? origin : 'http://localhost:8000'; res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': allowOrigin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(JSON.stringify(body)); }
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
  return server;
}
module.exports = { startControlServer };
