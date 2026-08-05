const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const acreHome = process.env.ACRE_HOME || path.join(os.homedir(), '.acre');
const configPath = path.join(acreHome, 'config.json');
const statePath = path.join(acreHome, 'state.json');

function ensureHome() { fs.mkdirSync(acreHome, { recursive: true, mode: 0o700 }); }
function defaults() {
  return { version: 1, configured: false, projects: [], settings: { autoFix: false, aiModel: '', notifications: {} }, secrets: {} };
}
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function writeJson(file, value) { ensureHome(); fs.writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 }); }
function getConfig() { return { ...defaults(), ...readJson(configPath, defaults()) }; }
function saveConfig(config) { writeJson(configPath, config); }
function getState() { return readJson(statePath, { incidents: [], events: [], startedAt: null, pid: null }); }
function saveState(state) { writeJson(statePath, state); }

// Encryption keys never leave the machine. A user-provided ACRE_MASTER_KEY takes precedence.
function key() { return crypto.scryptSync(process.env.ACRE_MASTER_KEY || `${os.userInfo().username}:${os.hostname()}:acre`, 'acre-v1', 32); }
function encrypt(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  return [iv.toString('base64'), cipher.update(value, 'utf8', 'base64') + cipher.final('base64'), cipher.getAuthTag().toString('base64')].join('.');
}
function decrypt(value) {
  if (!value) return '';
  const [iv, data, tag] = value.split('.'); const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64')); return decipher.update(data, 'base64', 'utf8') + decipher.final('utf8');
}
module.exports = { acreHome, configPath, getConfig, saveConfig, getState, saveState, encrypt, decrypt };
