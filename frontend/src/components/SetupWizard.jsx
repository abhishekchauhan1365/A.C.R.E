import { useState } from 'react';
import { Terminal } from 'lucide-react';

function SetupWizard({ config, saveConfig, saving, error }) {
    const [projectName, setProjectName] = useState('My service');
    const [logPath, setLogPath] = useState('');
    const [projectRoot, setProjectRoot] = useState('');
    const [framework, setFramework] = useState('node');
    const [autoFix, setAutoFix] = useState(false);
    const [aiApiKey, setAiApiKey] = useState(config?.aiApiKey || '');
    const [slackWebhook, setSlackWebhook] = useState(config?.slackWebhook || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        saveConfig({
            projectName,
            logPath: logPath.trim(),
            projectRoot: projectRoot.trim(),
            framework,
            autoFix,
            aiApiKey: aiApiKey.trim(),
            slackWebhook: slackWebhook.trim(),
            aiModel: 'llama-3.3-70b-versatile'
        });
    };

    return (
        <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white p-6 sm:p-10 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#101216] text-white">
                    <Terminal size={20} />
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-[#111]">Register Monitored Service</h2>
                    <p className="text-xs text-[#737674]">Configure real application log tailing and automated crash remediation.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Project Name</label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-[#111] placeholder:text-black/30 outline-none focus:border-black/40 transition-colors"
                        placeholder="e.g. backend-api"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Absolute Log Path</label>
                        <input
                            type="text"
                            value={logPath}
                            onChange={e => setLogPath(e.target.value)}
                            required
                            placeholder={process.platform === 'win32' ? 'C:\\projects\\app\\logs\\app.log' : '/var/log/app/app.log'}
                            className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 font-mono text-xs text-[#111] placeholder:text-black/30 outline-none focus:border-black/40 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Absolute Project Root</label>
                        <input
                            type="text"
                            value={projectRoot}
                            onChange={e => setProjectRoot(e.target.value)}
                            required
                            placeholder={process.platform === 'win32' ? 'C:\\projects\\app' : '/var/www/app'}
                            className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 font-mono text-xs text-[#111] placeholder:text-black/30 outline-none focus:border-black/40 transition-colors"
                        />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Framework / Profile</label>
                        <select
                            value={framework}
                            onChange={e => setFramework(e.target.value)}
                            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-[#111] outline-none focus:border-black/40 transition-colors"
                        >
                            <option value="node">Node.js</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="nginx">NGINX</option>
                            <option value="docker">Docker</option>
                            <option value="redis">Redis</option>
                            <option value="pm2">PM2</option>
                            <option value="generic">Generic Logs</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Groq API Key (Optional)</label>
                        <input
                            type="password"
                            value={aiApiKey}
                            onChange={e => setAiApiKey(e.target.value)}
                            placeholder="gsk_... (stored encrypted)"
                            className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-[#111] placeholder:text-black/30 outline-none focus:border-black/40 transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#6e716f] mb-1.5">Slack Webhook URL (Optional)</label>
                    <input
                        type="url"
                        value={slackWebhook}
                        onChange={e => setSlackWebhook(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-[#111] placeholder:text-black/30 outline-none focus:border-black/40 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2 pt-1">
                    <input
                        type="checkbox"
                        id="autoFixCheckbox"
                        checked={autoFix}
                        onChange={e => setAutoFix(e.target.checked)}
                        className="h-4 w-4 rounded border-black/20 text-[#101216]"
                    />
                    <label htmlFor="autoFixCheckbox" className="text-xs text-[#555956] cursor-pointer">
                        Enable Auto-Fix loop for safe, validated low-risk restarts
                    </label>
                </div>

                {error && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="mt-2 w-full rounded-xl bg-[#101216] px-4 py-3 text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 transition-colors"
                >
                    {saving ? 'Initializing watcher…' : 'Start Monitoring Service'}
                </button>
            </form>
        </div>
    );
}

export default SetupWizard;
