const os = require('os');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const db = require('./db'); // our SQLite database
const { proposePatch } = require('../lib/ai-engine');
const patchEngine = require('../lib/patch-engine');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json());

// Serve static files from the compiled frontend
const FRONTEND_DIST = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_DIST));

const PORT = process.env.PORT || 8000;
const { getConfig, saveConfig, getState, saveState, encrypt } = require('../lib/config-store');
const { start: startDaemon } = require('../lib/daemon');
let daemonHandle = null;

// JWT secret loaded from .env — never hardcoded
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'replace_with_a_long_random_secret') {
    throw new Error('JWT_SECRET must be set to a secure value before starting the server.');
}

// AI analysis is opt-in. Never embed service credentials in source code.
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// ────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
}

// ────────────────────────────────────────────────────────────
// SIGNUP ROUTE
// ────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
        ).run(name, email, hashedPassword);

        const token = jwt.sign(
            { id: result.lastInsertRowid, email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ New user signed up: ${email}`);
        res.status(201).json({ token, user: { id: result.lastInsertRowid, name, email } });

    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).json({ error: 'Signup failed. Please try again.' });
    }
});

// ────────────────────────────────────────────────────────────
// LOGIN ROUTE
// ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`🔐 User logged in: ${email}`);
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, name, email, createdAt FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
});

// ────────────────────────────────────────────────────────────
// CONFIGURATION ENDPOINTS
// ────────────────────────────────────────────────────────────
app.get('/api/config', requireAuth, (req, res) => {
    res.json(getConfig());
});

app.post('/api/config', requireAuth, async (req, res) => {
    try {
        const { projectName, logPath, projectRoot, framework, aiApiKey, aiModel, autoFix, slackWebhook } = req.body;
        if (!logPath || !path.isAbsolute(logPath)) return res.status(400).json({ error: 'Log path must be an absolute path.' });
        if (!projectRoot || !path.isAbsolute(projectRoot)) return res.status(400).json({ error: 'Project root must be an absolute path.' });
        const config = getConfig();
        config.configured = true;
        const project = { id: `web-${Date.now()}`, name: projectName || 'Monitored service', platform: process.platform, logPath, projectRoot, framework: framework || 'generic', restartCommand: '', validateCommand: '', autoFix: Boolean(autoFix), allowCodePatches: false, createdAt: new Date().toISOString() };
        db.prepare('DELETE FROM projects WHERE userId = ?').run(req.user.id);
        db.prepare('INSERT INTO projects (id, userId, name, platform, logPath, projectRoot, framework, autoFix) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(project.id, req.user.id, project.name, project.platform, project.logPath, project.projectRoot, project.framework, Number(project.autoFix));
        db.prepare('INSERT INTO user_settings (userId, aiModel, autoFix, slackWebhook) VALUES (?, ?, ?, ?) ON CONFLICT(userId) DO UPDATE SET aiModel = excluded.aiModel, autoFix = excluded.autoFix, slackWebhook = excluded.slackWebhook').run(req.user.id, aiModel || 'llama-3.3-70b-versatile', Number(autoFix), slackWebhook || '');
        config.projects = [...(config.projects || []).filter(item => item.logPath !== logPath), project];
        config.settings = {
            ...config.settings,
            aiModel: aiModel || config.settings?.aiModel || 'llama-3.3-70b-versatile',
            autoFix: Boolean(autoFix),
            notifications: { ...config.settings?.notifications, slack: slackWebhook || '' }
        };
        if (aiApiKey) config.secrets = { ...config.secrets, groqApiKey: encrypt(aiApiKey) };
        
        saveConfig(config);
        if (daemonHandle) await daemonHandle.stop();
        daemonHandle = startDaemon({ foreground: false });
        console.log('⚙️ Control plane configuration updated.');
        res.json({ success: true, project, message: 'Configuration saved and monitoring has started.' });
    } catch (err) {
        console.error('Failed to save config:', err.message);
        res.status(500).json({ error: 'Failed to save configuration.' });
    }
});

function findIncident(id) {
    const state = getState();
    const incident = state.incidents.find(item => item.id === id);
    if (!incident) throw new Error('Incident not found.');
    const config = getConfig();
    let project = config.projects.find(item => item.id === incident.projectId);
    if (!project) {
        const row = db.prepare('SELECT id, name, platform, logPath, projectRoot, framework, autoFix FROM projects WHERE id = ?').get(incident.projectId);
        if (row) project = { ...row, autoFix: Boolean(row.autoFix) };
    }
    if (!project) throw new Error('The incident project is no longer configured.');
    return { state, incident, config, project };
}

function saveEvent(state, event) {
    state.events.unshift({ at: new Date().toISOString(), ...event });
    state.events = state.events.slice(0, 500);
}

// ────────────────────────────────────────────────────────────
// INCIDENT REMEDIATION & PATCH ENDPOINTS (protected ── requires valid JWT)
// ────────────────────────────────────────────────────────────
app.post('/api/v1/incidents/:id/approve', requireAuth, async (req, res) => {
    try {
        const { state, incident } = findIncident(req.params.id);
        incident.status = 'approved';
        incident.approvedAt = new Date().toISOString();
        saveEvent(state, {
            type: 'plan-approved',
            project: incident.project,
            message: `Remediation plan for incident ${incident.id} approved by ${req.user.email}.`
        });
        saveState(state);
        res.json({ success: true, incident, message: 'Plan approved. Source-code changes still require explicit patch application.' });
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

app.post('/api/v1/incidents/:id/patch', requireAuth, async (req, res) => {
    try {
        const { state, incident, config, project } = findIncident(req.params.id);
        if (!project.projectRoot) project.projectRoot = patchEngine.projectRoot(project);
        const proposal = await proposePatch({ project, incident, config });
        if (!proposal.changes.length) {
            return res.status(422).json({ error: proposal.summary || 'No safe patch could be generated.' });
        }
        const checked = patchEngine.preview(project, proposal.changes);
        incident.patch = { ...proposal, changes: checked.changes, generatedAt: new Date().toISOString(), status: 'proposed' };
        saveEvent(state, { type: 'patch-proposed', project: project.name, message: proposal.summary });
        saveState(state);
        res.json({ success: true, patch: incident.patch });
    } catch (err) {
        res.status(422).json({ error: err.message });
    }
});

app.post('/api/v1/incidents/:id/apply-patch', requireAuth, async (req, res) => {
    try {
        const { state, incident, project } = findIncident(req.params.id);
        if (!incident.patch || incident.patch.status !== 'proposed') {
            return res.status(400).json({ error: 'Generate and review a patch before applying it.' });
        }
        if (incident.risk === 'high') {
            return res.status(403).json({ error: 'High-risk changes cannot be applied automatically by A.C.R.E.' });
        }
        const result = await patchEngine.apply(project, incident.patch.changes);
        incident.patch.status = result.validation.status === 'failed' ? 'applied-validation-failed' : 'applied';
        incident.patch.appliedAt = new Date().toISOString();
        incident.patch.backupRoot = result.backupRoot;
        incident.status = 'patched';
        saveEvent(state, { type: 'patch-applied', project: project.name, message: `Patch applied. Validation: ${result.validation.status}.` });
        saveState(state);
        res.json({ success: true, incident, result });
    } catch (err) {
        res.status(422).json({ error: err.message });
    }
});

app.post('/api/v1/incidents/:id/rollback-patch', requireAuth, async (req, res) => {
    try {
        const { state, incident, project } = findIncident(req.params.id);
        if (!incident.patch?.backupRoot || !String(incident.patch.status).startsWith('applied')) {
            return res.status(400).json({ error: 'No applied patch is available to roll back.' });
        }
        const result = patchEngine.rollback(project, incident.patch.changes, incident.patch.backupRoot);
        incident.patch.status = 'rolled-back';
        incident.status = 'open';
        saveEvent(state, { type: 'patch-rolled-back', project: project.name, message: 'Applied patch restored from local backup.' });
        saveState(state);
        res.json({ success: true, incident, result });
    } catch (err) {
        res.status(422).json({ error: err.message });
    }
});

// ────────────────────────────────────────────────────────────
// RESOLVE ROUTE (protected ── requires valid JWT)
// ────────────────────────────────────────────────────────────
app.post('/api/resolve', requireAuth, async (req, res) => {
    try {
        const config = getConfig();
        const incidentId = req.body?.id;
        const state = getState();
        const incident = incidentId ? state.incidents.find(item => item.id === incidentId) : null;
        if (incident) {
            incident.status = 'resolved';
            incident.resolvedAt = new Date().toISOString();
            saveEvent(state, {
                type: 'incident-resolved',
                project: incident.project,
                message: `Incident ${incident.id} resolved by authenticated user.`
            });
            saveState(state);
        }
        const slackWebhook = config.settings?.notifications?.slack;
        if (slackWebhook) {
            try {
                await fetch(slackWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: `✅ *A.C.R.E. Incident Resolved!*\nThe crash has been mitigated and marked resolved.` })
                });
            } catch (e) {
                console.error('Failed to dispatch webhook:', e.message);
            }
        }
        res.json({ success: true, message: 'Incident resolved.' });
    } catch (err) {
        console.error('Failed to resolve incident:', err.message);
        res.status(500).json({ success: false, error: 'Could not resolve incident.' });
    }
});

// ────────────────────────────────────────────────────────────
// OVERVIEW ROUTE WITH REAL TELEMETRY
// ────────────────────────────────────────────────────────────
app.get('/api/v1/overview', requireAuth, (req, res) => {
    const config = getConfig();
    const state = getState();
    const projects = db.prepare('SELECT id, name, platform, logPath, projectRoot, framework, autoFix, createdAt FROM projects WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id).map(project => ({ ...project, autoFix: Boolean(project.autoFix) }));
    const projectIds = new Set(projects.map(project => project.id));
    const settings = db.prepare('SELECT aiModel, autoFix FROM user_settings WHERE userId = ?').get(req.user.id) || { aiModel: '', autoFix: 0 };

    res.json({
        configured: config.configured,
        projects,
        settings: {
            autoFix: Boolean(settings.autoFix),
            aiModel: settings.aiModel
        },
        daemon: { pid: state.pid, startedAt: state.startedAt, uptimeSeconds: state.startedAt ? Math.floor((Date.now() - Date.parse(state.startedAt)) / 1000) : 0 },
        incidents: state.incidents.filter(item => projectIds.has(item.projectId) && item.status !== 'resolved').slice(0, 50),
        events: state.events.filter(item => !item.project || projects.some(project => project.name === item.project)).slice(0, 50),
        system: {
            hostname: os.hostname(),
            platform: os.platform(),
            cpuCount: os.cpus().length,
            memory: { total: os.totalmem(), free: os.freemem() },
            process: process.memoryUsage()
        }
    });
});
// ────────────────────────────────────────────────────────────
// FRONTEND FALLBACK ROUTE (for React Router)
// ────────────────────────────────────────────────────────────
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`📡 A.C.R.E. AI Control Server running at http://localhost:${PORT}`);
        const config = getConfig();
        if (config.projects?.length) daemonHandle = startDaemon({ foreground: false });
    });
}

module.exports = app;
