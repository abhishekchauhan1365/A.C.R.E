import React, { useState } from 'react';
import { Terminal } from 'lucide-react';

function SetupWizard({ config, saveConfig, saving, error }) {
    const [nginxLogPath, setNginxLogPath] = useState(config.nginxLogPath || '/var/log/nginx/error.log');
    const [aiApiKey, setAiApiKey] = useState(config.aiApiKey || '');
    const [slackWebhook, setSlackWebhook] = useState(config.slackWebhook || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        saveConfig({
            nginxLogPath, aiApiKey, slackWebhook, validationLevel: 'strict',
            enabledRules: ['typo', 'fastcgi_pass', 'upstream']
        });
    };

    return (
        <div className="card-ent animate-fade-up" style={{ maxWidth: '600px', margin: '40px auto' }}>
            <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '32px' }}>
                <Terminal size={32} style={{ marginBottom: '16px', color: 'var(--text-h)' }} />
                <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Initialize Control Plane</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    Configure the A.C.R.E. daemon bindings to begin monitoring your clusters.
                </p>
            </div>
            
            <form className="card-body" style={{ padding: '0 32px 32px' }} onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nginx Error Log Target</label>
                    <input type="text" value={nginxLogPath} onChange={e => setNginxLogPath(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>LLM Inference Key (Groq)</label>
                    <input type="password" placeholder="gsk_..." value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: '32px' }}>
                    <label>Slack Webhook URL (Optional)</label>
                    <input type="url" placeholder="https://hooks.slack.com/services/..." value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)} />
                </div>
                
                {error && <div className="auth-error" style={{ marginBottom: '24px' }}>{error}</div>}
                
                <button className="btn-ent primary" type="submit" disabled={saving} style={{ width: '100%', padding: '12px' }}>
                    {saving ? 'Provisioning Hook...' : 'Initialize Daemon Binding'}
                </button>
            </form>
        </div>
    );
}

export default SetupWizard;
