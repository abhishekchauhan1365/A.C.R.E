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
module.exports = { analyse, riskFor };
