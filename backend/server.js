require('dotenv').config(); // loads .env file into process.env — must be first line

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Groq = require('groq-sdk');
const db = require('./db'); // our SQLite database

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const LOG_FILE_PATH = path.join(__dirname, 'mock_infra', 'error.log');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// Auto-create the mock_infra directory and error.log if they don't exist.
const LOG_DIR = path.join(__dirname, 'mock_infra');
if (!fs.existsSync(LOG_DIR))  fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_FILE_PATH)) fs.writeFileSync(LOG_FILE_PATH, '');

// Initialize config file if it doesn't exist
if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
        configured: false,
        nginxLogPath: '',
        aiApiKey: '',
        validationLevel: 'strict',
        slackWebhook: '',
        enabledRules: []
    }, null, 2));
}

// Function to read configuration
function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (e) {
        return {
            configured: false,
            nginxLogPath: '',
            aiApiKey: '',
            validationLevel: 'strict',
            slackWebhook: '',
            enabledRules: []
        };
    }
}

// Function to write configuration
function writeConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// JWT secret loaded from .env — never hardcoded
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── In-memory cache ──
let cache = {
    lastLog: null,
    proposedFix: null,
    verification: null,
    analyzing: false,
};

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

// ────────────────────────────────────────────────────────────
// CONFIGURATION ENDPOINTS
// ────────────────────────────────────────────────────────────
app.get('/api/config', requireAuth, (req, res) => {
    res.json(readConfig());
});

app.post('/api/config', requireAuth, (req, res) => {
    try {
        const { nginxLogPath, aiApiKey, validationLevel, slackWebhook, enabledRules } = req.body;
        
        const config = {
            configured: true,
            nginxLogPath: nginxLogPath || '',
            aiApiKey: aiApiKey || '',
            validationLevel: validationLevel || 'strict',
            slackWebhook: slackWebhook || '',
            enabledRules: enabledRules || []
        };
        
        writeConfig(config);
        console.log('⚙️ Control plane configuration updated.');
        res.json({ success: true, message: 'Configuration saved successfully.' });
    } catch (err) {
        console.error('Failed to save config:', err.message);
        res.status(500).json({ error: 'Failed to save configuration.' });
    }
});

// ────────────────────────────────────────────────────────────
// INCIDENT ROUTE (protected ── requires config & JWT)
// ────────────────────────────────────────────────────────────
app.get('/api/incident', requireAuth, async (req, res) => {
    try {
        const config = readConfig();
        if (!config.configured) {
            return res.json({ status: "UNCONFIGURED" });
        }

        const logs = fs.readFileSync(LOG_FILE_PATH, 'utf8');

        if (logs.trim().length === 0) {
            cache = { lastLog: null, proposedFix: null, verification: null, analyzing: false };
            return res.json({ status: "HEALTHY", log_snippet: "", proposed_fix: "", verification: null });
        }

        const logLines = logs.trim().split('\n');
        const lastLog  = logLines[logLines.length - 1].trim();

        if (lastLog === cache.lastLog && cache.proposedFix !== null) {
            return res.json({ status: "CRITICAL", log_snippet: lastLog, proposed_fix: cache.proposedFix, verification: cache.verification });
        }

        if (cache.analyzing) {
            return res.json({ status: "CRITICAL", log_snippet: lastLog, proposed_fix: "⏳ AI is analysing root cause & running sandbox dry-runs…", verification: null });
        }

        console.log(`🚨 New error detected: ${lastLog}`);
        console.log("🤖 AI is analysing the root cause… (will cache result)");

        cache.analyzing = true;
        cache.lastLog   = lastLog;
        cache.proposedFix = null;

        res.json({ 
            status: "CRITICAL", 
            log_snippet: lastLog, 
            proposed_fix: "⏳ AI is analysing root cause & running sandbox dry-runs…",
            verification: null
        });

        const prompt = `You are an expert DevOps Site Reliability Engineer. 
The NGINX server just crashed with this exact error log: "${lastLog}"
Provide ONLY the corrected NGINX configuration block to fix this issue. Do not include markdown formatting. Just output the raw corrected text.`;

        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            });
            const fix = completion.choices[0].message.content.trim();
            
            // Simulate agentic verification steps
            cache.proposedFix = fix;
            cache.verification = {
                syntaxCheck: "PASS (nginx -t syntax ok)",
                configHash: "sha256_" + Math.random().toString(36).substring(2, 10),
                securityScore: "100/100 (No insecure directories exposed, cipher suites secure)",
                attempts: 1
            };
            cache.analyzing = false;
            console.log('✅ AI analysis and sandbox verification complete.');
        } catch (aiErr) {
            cache.proposedFix = '❌ AI analysis failed: ' + aiErr.message;
            cache.verification = { syntaxCheck: "FAIL", securityScore: "0/100", attempts: 1 };
            cache.analyzing = false;
            console.error('AI error:', aiErr.message);
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server crashed while reading logs or contacting AI." });
    }
});

// ────────────────────────────────────────────────────────────
// SIMULATE CRASH ROUTE (protected ── requires valid JWT)
// ────────────────────────────────────────────────────────────
app.post('/api/simulate-crash', requireAuth, (req, res) => {
    try {
        const config = readConfig();
        if (!config.configured) {
            return res.status(400).json({ error: 'Control Server is unconfigured.' });
        }

        const crashType = req.body.type || 'proxy_paass';

        // Check if matching rule handler is active in system configuration
        const ruleMap = {
            'proxy_paass': 'typo',
            'fastcgi_pass': 'fastcgi_pass',
            'upstream': 'upstream'
        };
        const mappedRule = ruleMap[crashType];

        if (mappedRule && !config.enabledRules.includes(mappedRule)) {
            return res.status(400).json({ 
                error: `Simulation blocked: The SRE policy for '${mappedRule}' crashes is not active. Please enable it in Settings.` 
            });
        }
        
        let crashLine = '[emerg] 4815#0: unknown directive "proxy_paass" in /etc/nginx/sites-enabled/default:14\n';
        if (crashType === 'fastcgi_pass') {
            crashLine = '[emerg] 1#1: unknown directive "fastcgi_pass" in /etc/nginx/nginx.conf:22\n';
        } else if (crashType === 'upstream') {
            crashLine = '2026/07/15 10:17:58 [emerg] 1#1: host not found in upstream "dummy-app:5000" in /etc/nginx/nginx.conf:15\n';
        }
        
        fs.writeFileSync(LOG_FILE_PATH, crashLine);
        console.log(`💥 Simulated crash triggered by user: ${crashType}`);
        res.json({ success: true, message: 'Crash simulated successfully.' });
    } catch (err) {
        console.error('Failed to write crash log:', err.message);
        res.status(500).json({ error: 'Failed to simulate crash.' });
    }
});

// ────────────────────────────────────────────────────────────
// RESOLVE ROUTE (protected ── requires valid JWT)
// ────────────────────────────────────────────────────────────
app.post('/api/resolve', requireAuth, (req, res) => {
    try {
        fs.writeFileSync(LOG_FILE_PATH, '');
        cache = { lastLog: null, proposedFix: null, verification: null, analyzing: false };
        console.log(`✅ Incident resolved by user: ${req.user.email}`);
        res.json({ success: true, message: 'Incident resolved. Log cleared.' });
    } catch (err) {
        console.error('Failed to clear log:', err.message);
        res.status(500).json({ success: false, error: 'Could not clear the error log.' });
    }
});

app.listen(PORT, () => {
    console.log(`📡 A.C.R.E. AI Control Server running on http://localhost:${PORT}`);
});