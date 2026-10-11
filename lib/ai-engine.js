const { decrypt } = require('./config-store');

function riskFor(text) {
  if (/delete|rm |drop |environment|config(uration)?\s+(file|change)|credentials/i.test(text)) return 'high';
  if (/install|rebuild|regenerate|dependency/i.test(text)) return 'medium';
  return 'low';
}
async function analyse({ project, lines, config }) {
  const context = lines.slice(-30).join('\n').slice(-12000);
  const apiKey = process.env.GROQ_API_KEY || decrypt(config.secrets?.groqApiKey || '');
  if (!apiKey || !config.settings.aiModel) return { summary: 'AI analysis is unavailable: configure a Groq key and model.', risk: 'medium', action: 'Review the captured log context.', source: 'local' };
  const Groq = require('groq-sdk');
  const completion = await new Groq({ apiKey }).chat.completions.create({ model: config.settings.aiModel, temperature: 0, messages: [{ role: 'system', content: 'You are an SRE. Return concise JSON only with summary, action, and risk (low|medium|high). Never suggest destructive commands.' }, { role: 'user', content: `Project: ${project.name}; framework: ${project.framework}; OS: ${process.platform}; logs:\n${context}` }] });
  const raw = completion.choices[0].message.content || '{}';
  try { const result = JSON.parse(raw.replace(/```json|```/g, '')); return { ...result, risk: riskFor(`${result.action} ${result.summary}`), source: 'groq' }; } catch { return { summary: raw, action: 'Review proposed remediation before executing it.', risk: riskFor(raw), source: 'groq' }; }
}
async function proposePatch({ project, incident, config }) {
  const apiKey = process.env.GROQ_API_KEY || decrypt(config.secrets?.groqApiKey || '');
  if (!apiKey || !config.settings.aiModel) throw new Error('Configure a Groq API key and model before generating a patch.');
  const Groq = require('groq-sdk');
  const logs = (incident.context || []).slice(-30).join('\n').slice(-12000);
  const system = 'You generate narrowly scoped, reviewable code edits. Return JSON only: {summary, risk, changes:[{path,search,replace,reason}]}. path is relative to the project root. Provide 1–3 changes. search must be an exact contiguous source block likely to exist once. Never change .env, dependencies, lockfiles, package.json, build scripts, credentials, deployment config, or delete files. If no safe exact source edit can be inferred, return changes:[] and explain why.';
  const user = `Project root: ${project.projectRoot || 'not set'}\nFramework: ${project.framework}\nIncident: ${incident.summary}\nSuggested action: ${incident.action}\nLogs:\n${logs}`;
  const completion = await new Groq({ apiKey }).chat.completions.create({ model: config.settings.aiModel, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
  const raw = completion.choices[0].message.content || '{}';
  let result; try { result = JSON.parse(raw.replace(/```json|```/g, '')); } catch { throw new Error('AI returned an invalid patch response.'); }
  return { summary: String(result.summary || 'Patch proposal'), risk: riskFor(`${result.risk || ''} ${result.summary || ''}`), changes: Array.isArray(result.changes) ? result.changes : [] };
}
module.exports = { analyse, proposePatch, riskFor };
