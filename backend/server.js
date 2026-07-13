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

// Auto-create the mock_infra directory and error.log if they don't exist.
// On Railway (cloud), these files won't be present — we create them on first run.
const LOG_DIR = path.join(__dirname, 'mock_infra');
if (!fs.existsSync(LOG_DIR))  fs.mkdirSync(LOG_DIR, { recursive: true });
if (!fs.existsSync(LOG_FILE_PATH)) fs.writeFileSync(LOG_FILE_PATH, '');


// JWT secret loaded from .env — never hardcoded
const JWT_SECRET = process.env.JWT_SECRET;

// Initialize Groq client — replaces Ollama.
// Groq runs llama3 on their cloud servers for free.
// API key is read from .env (never hardcoded in source code).
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── In-memory cache: only call the AI when the log actually changes ──
let cache = {
    lastLog: null,
    proposedFix: null,
    analyzing: false,
};

// ────────────────────────────────────────────────────────────
// AUTH MIDDLEWARE
// This function runs BEFORE any protected route.
// It reads the token from the request header, verifies it,
// and either lets the request through or blocks it with 401.
// ────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    // The header looks like: "Authorization: Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1]; // Extract just the token part

    try {
        // jwt.verify throws an error if the token is expired or tampered with
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach decoded user info to the request object
        next(); // ✅ Token is valid — let the request continue to the route
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }
}

// ────────────────────────────────────────────────────────────
// SIGNUP ROUTE
// Creates a new user account.
// Steps: validate → check duplicate email → hash password → save → return token
// ────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    try {
        // Check if email already exists
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Hash the password — bcrypt adds a random "salt" so even identical
        // passwords produce different hashes. The 10 is the "cost factor" (how slow to hash).
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into SQLite
        const result = db.prepare(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
        ).run(name, email, hashedPassword);

        // Issue a JWT token valid for 7 days
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
// Verifies credentials and returns a token.
// Steps: find user → compare password → return token
// ────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        // Find user by email
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            // Don't say "email not found" — that tells attackers which emails exist.
            // Always say "invalid credentials" for both wrong email and wrong password.
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Compare submitted password against stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Issue token
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
// INCIDENT ROUTE (protected — requires valid JWT)
// requireAuth runs first. If token is invalid, this never executes.
// ────────────────────────────────────────────────────────────
app.get('/api/incident', requireAuth, async (req, res) => {
    try {
        const logs = fs.readFileSync(LOG_FILE_PATH, 'utf8');

        if (logs.trim().length === 0) {
            cache = { lastLog: null, proposedFix: null, analyzing: false };
            return res.json({ status: "HEALTHY", log_snippet: "", proposed_fix: "" });
        }

        const logLines = logs.trim().split('\n');
        const lastLog  = logLines[logLines.length - 1].trim();

        if (lastLog === cache.lastLog && cache.proposedFix !== null) {
            return res.json({ status: "CRITICAL", log_snippet: lastLog, proposed_fix: cache.proposedFix });
        }

        if (cache.analyzing) {
            return res.json({ status: "CRITICAL", log_snippet: lastLog, proposed_fix: "⏳ AI is analysing the root cause, please wait…" });
        }

        console.log(`🚨 New error detected: ${lastLog}`);
        console.log("🤖 AI is analysing the root cause… (will cache result)");

        cache.analyzing = true;
        cache.lastLog   = lastLog;
        cache.proposedFix = null;

        res.json({ status: "CRITICAL", log_snippet: lastLog, proposed_fix: "⏳ AI is analysing the root cause, please wait…" });

        const prompt = `You are an expert DevOps Site Reliability Engineer. 
The NGINX server just crashed with this exact error log: "${lastLog}"
Provide ONLY the corrected NGINX configuration block to fix this issue. Do not include markdown formatting. Just output the raw corrected text.`;

        try {
            // Groq's API follows the OpenAI chat format:
            // messages = array of { role, content } objects
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile', // Groq's fastest free llama3 model
                messages: [{ role: 'user', content: prompt }],
                temperature: 0,
            });
            cache.proposedFix = completion.choices[0].message.content.trim();
            cache.analyzing   = false;
            console.log('✅ AI analysis complete. Result cached.');
        } catch (aiErr) {
            cache.proposedFix = '❌ AI analysis failed: ' + aiErr.message;
            cache.analyzing   = false;
            console.error('AI error:', aiErr.message);
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server crashed while reading logs or contacting AI." });
    }
});

// ────────────────────────────────────────────────────────────
// RESOLVE ROUTE (protected — requires valid JWT)
// ────────────────────────────────────────────────────────────
app.post('/api/resolve', requireAuth, (req, res) => {
    try {
        fs.writeFileSync(LOG_FILE_PATH, '');
        cache = { lastLog: null, proposedFix: null, analyzing: false };
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