import { useState, useEffect } from 'react';
import { useNavigate, NavLink, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { 
    ShieldCheck, 
    AlertTriangle, 
    RefreshCw, 
    Cpu, 
    AlertCircle, 
    CheckCheck, 
    LogOut, 
    Terminal, 
    Activity, 
    Server, 
    Settings,
    Lock,
    Save,
    Check
} from 'lucide-react';

function DashboardPage() {
    const [incident, setIncident]   = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [resolving, setResolving] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [rolloutStep, setRolloutStep] = useState(0); // 0: Idle, 1: Dry-Run, 2: Canary, 3: Traffic, 4: Promote

    // Configuration states
    const [isConfigured, setIsConfigured] = useState(true);
    const [config, setConfig] = useState({
        nginxLogPath: '/var/log/nginx/error.log',
        aiApiKey: 'Default pre-loaded key',
        validationLevel: 'strict',
        slackWebhook: 'https://hooks.slack.com/services/T0000/B0000/XXXX',
        enabledRules: ['typo', 'fastcgi_pass', 'upstream']
    });
    const [savingConfig, setSavingConfig] = useState(false);

    // Live telemetry simulation states
    const [metrics, setMetrics] = useState({ cpu: 12, traffic: 24, totalReq: 18420 });
    const [liveLogs, setLiveLogs] = useState([
        '192.168.1.45 - - [16/Jul/2026:15:01:02] "GET /index.html HTTP/1.1" 200 4826',
        '192.168.1.102 - - [16/Jul/2026:15:01:14] "GET /assets/logo.png HTTP/1.1" 304 0',
        '192.168.1.88 - - [16/Jul/2026:15:02:00] "POST /api/auth/login HTTP/1.1" 200 128',
    ]);

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('acre_user') || '{}');

    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('acre_token')}` }
    });

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${API}/api/config`, authHeader());
            setConfig(res.data);
            setIsConfigured(res.data.configured);
        } catch (err) {
            console.error('Failed to load system config:', err);
        }
    };

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API}/api/incident`, authHeader());
            if (response.data.status === 'UNCONFIGURED') {
                setIsConfigured(false);
            } else {
                setIncident(response.data);
                setIsConfigured(true);
            }
            setError('');
        } catch (err) {
            if (err.response?.status === 401) {
                handleLogout();
            } else {
                setError('Cannot reach A.C.R.E. Control Server.');
            }
        }
        setLoading(false);
    };

    const saveSystemConfig = async (updatedConfig) => {
        setSavingConfig(true);
        setError('');
        try {
            const res = await axios.post(`${API}/api/config`, updatedConfig, authHeader());
            if (res.data.success) {
                await fetchConfig();
                await fetchStatus();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save configuration.');
        }
        setSavingConfig(false);
    };

    const resolveIncident = async () => {
        setResolving(true);
        setError('');
        try {
            setRolloutStep(1);
            await new Promise(r => setTimeout(r, 1000));
            
            setRolloutStep(2);
            await new Promise(r => setTimeout(r, 1200));
            
            setRolloutStep(3);
            await new Promise(r => setTimeout(r, 1000));
            
            setRolloutStep(4);
            await new Promise(r => setTimeout(r, 800));

            await axios.post(`${API}/api/resolve`, {}, authHeader());
            await fetchStatus();
            setRolloutStep(0);
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
            else setError('Failed to complete automated canary rollout.');
            setRolloutStep(0);
        }
        setResolving(false);
    };

    const simulateCrash = async (type = selectedCrashType) => {
        setSimulating(true);
        try {
            await axios.post(`${API}/api/simulate-crash`, { type }, authHeader());
            await fetchStatus();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to trigger crash simulation.');
        }
        setSimulating(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('acre_token');
        localStorage.removeItem('acre_user');
        navigate('/');
    };

    // Initialize config and status polling
    useEffect(() => {
        fetchConfig();
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const isCritical = incident?.status === 'CRITICAL';
    const isHealthy  = incident?.status === 'HEALTHY';
    const dotClass   = error ? 'dot critical' : loading && !incident ? 'dot' : isCritical ? 'dot critical' : 'dot healthy';

    // Simulated telemetry tick loop
    useEffect(() => {
        const timer = setInterval(() => {
            setMetrics(prev => ({
                cpu: Math.max(5, Math.min(95, prev.cpu + Math.floor(Math.random() * 5) - 2)),
                traffic: Math.max(10, Math.min(60, prev.traffic + Math.floor(Math.random() * 7) - 3)),
                totalReq: prev.totalReq + Math.floor(Math.random() * 3)
            }));
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    // Live access log generator
    useEffect(() => {
        if (isCritical || !isConfigured) return; 
        
        const timer = setInterval(() => {
            const ips = ['127.0.0.1', '192.168.1.15', '10.0.0.4', '182.74.25.162', '192.168.1.102'];
            const requests = [
                'GET /api/v1/metrics HTTP/1.1',
                'GET /api/incident HTTP/1.1',
                'POST /api/auth/login HTTP/1.1',
                'GET /assets/index.js HTTP/1.1',
                'GET /assets/index.css HTTP/1.1',
                'GET /favicon.ico HTTP/1.1',
                'POST /api/resolve HTTP/1.1'
            ];
            const referrers = [
                'http://localhost:5173/dashboard',
                'http://localhost:5173/',
                '-'
            ];
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
                'PostmanRuntime/7.32.3'
            ];
            const statuses = [200, 200, 200, 304, 200, 204, 404];
            
            const ip = ips[Math.floor(Math.random() * ips.length)];
            const request = requests[Math.floor(Math.random() * requests.length)];
            const referrer = referrers[Math.floor(Math.random() * referrers.length)];
            const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const size = (status === 304 || status === 204) ? 0 : Math.floor(Math.random() * 8500) + 150;
            
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[now.getMonth()];
            const year = now.getFullYear();
            const time = now.toTimeString().split(' ')[0]; 
            const tz = "+0530";
            const timeLocal = `${day}/${month}/${year}:${time} ${tz}`;

            const newLine = `${ip} - - [${timeLocal}] "${request}" ${status} ${size} "${referrer}" "${ua}"`;
            setLiveLogs(prev => [...prev.slice(-4), newLine]); 
        }, 2500);
        return () => clearInterval(timer);
    }, [isCritical, isConfigured]);

    return (
        <div className="dash-cyber">
            {/* ── Left Sidebar Navigation (Tab Structure) ── */}
            <aside className="dash-sidebar animate-fade-up">
                <div className="dash-sidebar-brand" onClick={() => navigate('/')}>
                    <Cpu size={20} /> A.C.R.E.
                </div>
                
                <nav className="dash-nav-menu">
                    <NavLink to="/dashboard" end className={({isActive}) => isActive ? "dash-nav-item active" : "dash-nav-item"}>
                        <Terminal size={16} /> Overview
                    </NavLink>
                    
                    {/* Lock other tabs if system is unconfigured */}
                    <NavLink 
                        to={isConfigured ? "/dashboard/incidents" : "#"} 
                        className={({isActive}) => (isActive && isConfigured) ? "dash-nav-item active" : "dash-nav-item"}
                        style={!isConfigured ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                    >
                        <Activity size={16} /> Incidents {!isConfigured && <Lock size={12} style={{marginLeft: 'auto'}}/>}
                    </NavLink>

                    <NavLink 
                        to={isConfigured ? "/dashboard/nodes" : "#"} 
                        className={({isActive}) => (isActive && isConfigured) ? "dash-nav-item active" : "dash-nav-item"}
                        style={!isConfigured ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                    >
                        <Server size={16} /> Nodes {!isConfigured && <Lock size={12} style={{marginLeft: 'auto'}}/>}
                    </NavLink>

                    <NavLink 
                        to={isConfigured ? "/dashboard/settings" : "#"} 
                        className={({isActive}) => (isActive && isConfigured) ? "dash-nav-item active" : "dash-nav-item"}
                        style={!isConfigured ? { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                    >
                        <Settings size={16} /> Settings {!isConfigured && <Lock size={12} style={{marginLeft: 'auto'}}/>}
                    </NavLink>
                </nav>

                <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Operator: <span style={{ color: 'var(--text-h)', fontWeight: 500 }}>{user.name}</span>
                    </div>
                    <button className="btn-cyber" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main Panel Container ── */}
            <div className="dash-main-container">
                <header className="dash-topbar animate-fade-up">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={dotClass}></span>
                        <span style={{ color: 'var(--text-h)', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            {!isConfigured ? 'CONFIGURATION REQUIRED' : isCritical ? 'Critical Alert' : 'Systems Operational'}
                        </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isConfigured && !isCritical && !error && (
                            <button 
                                className="btn-cyber" 
                                onClick={() => simulateCrash(config.enabledRules[0] === 'typo' ? 'proxy_paass' : config.enabledRules[0] === 'upstream' ? 'upstream' : 'fastcgi_pass')} 
                                disabled={simulating || config.enabledRules.length === 0}
                                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                            >
                                Simulate Crash
                            </button>
                        )}
                        <button className="btn-cyber" onClick={fetchStatus} disabled={loading}>
                            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> {loading ? 'Scanning...' : 'Refresh'}
                        </button>
                    </div>
                </header>

                <div className="dash-main">
                    {/* Render Configuration Setup Wizard if not configured */}
                    {!isConfigured ? (
                        <SetupWizard config={config} saveConfig={saveSystemConfig} saving={savingConfig} error={error} />
                    ) : (
                        <Routes>
                            <Route path="/" element={
                                <OverviewTab 
                                    metrics={metrics} 
                                    isCritical={isCritical} 
                                    isHealthy={isHealthy} 
                                    incident={incident} 
                                    liveLogs={liveLogs} 
                                    resolveIncident={resolveIncident} 
                                    resolving={resolving} 
                                    rolloutStep={rolloutStep}
                                    error={error}
                                    loading={loading}
                                />
                            } />
                            <Route path="/incidents" element={<IncidentsTab />} />
                            <Route path="/nodes" element={<NodesTab />} />
                            <Route path="/settings" element={
                                <SettingsTab 
                                    config={config} 
                                    saveConfig={saveSystemConfig} 
                                    saving={savingConfig} 
                                    simulateCrash={simulateCrash}
                                    simulating={simulating}
                                />
                            } />
                        </Routes>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── SETUP WIZARD COMPONENT ──
function SetupWizard({ config, saveConfig, saving, error }) {
    const [nginxLogPath, setNginxLogPath] = useState(config.nginxLogPath || 'C:\\nginx\\logs\\error.log');
    const [aiApiKey, setAiApiKey] = useState(config.aiApiKey || 'Default pre-loaded key');
    const [slackWebhook, setSlackWebhook] = useState(config.slackWebhook || 'https://hooks.slack.com/services/T0000/B0000/XXXX');
    const [enabledRules, setEnabledRules] = useState(config.enabledRules || ['typo', 'fastcgi_pass', 'upstream']);

    const handleRuleToggle = (ruleKey) => {
        setEnabledRules(prev => 
            prev.includes(ruleKey) 
                ? prev.filter(r => r !== ruleKey) 
                : [...prev, ruleKey]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveConfig({
            nginxLogPath,
            aiApiKey,
            validationLevel: 'strict',
            slackWebhook,
            enabledRules
        });
    };

    return (
        <div className="status-card-cyber critical animate-fade-up" style={{ maxWidth: '640px', borderTop: '2px solid var(--blue)' }}>
            <div className="status-header" style={{ background: 'rgba(59, 130, 246, 0.04)' }}>
                <h2 style={{ color: 'var(--blue)' }}>Control Plane System Initialization Required</h2>
            </div>
            <div className="status-body">
                <p style={{ fontSize: '14px', color: 'var(--text)', marginBottom: '24px', lineHeight: 1.6 }}>
                    Welcome to A.C.R.E. Before the autonomous SRE agent daemon can spin up, you must configure binding paths, credentials, and SRE policy rules.
                </p>

                {error && <div className="auth-error" style={{ marginBottom: '20px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                        <label>1. Infrastructure Log Path Binding</label>
                        <input 
                            type="text" 
                            value={nginxLogPath} 
                            onChange={(e) => setNginxLogPath(e.target.value)} 
                            placeholder="e.g. C:\nginx\logs\error.log"
                            required 
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The local log file location the SRE agent daemon will monitor.</div>
                    </div>

                    <div className="form-group">
                        <label>2. AI Model Gateway Token (Groq API Key)</label>
                        <input 
                            type="text" 
                            value={aiApiKey} 
                            onChange={(e) => setAiApiKey(e.target.value)} 
                            placeholder="Enter Groq token"
                            required 
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required to dispatch NGINX configurations for Llama 3.3 validation checks.</div>
                    </div>

                    <div className="form-group">
                        <label>3. ChatOps Notification Webhook URL</label>
                        <input 
                            type="text" 
                            value={slackWebhook} 
                            onChange={(e) => setSlackWebhook(e.target.value)} 
                            placeholder="https://hooks.slack.com/services/..."
                        />
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automated alert channels for Slack or Discord notifications.</div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', display: 'block', marginBottom: '10px' }}>
                            4. Active Policy Rule Engine (SRE Directives)
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                                { key: 'typo', label: 'Directive Typo Validation Rules (e.g. proxy_paass -> proxy_pass)' },
                                { key: 'fastcgi_pass', label: 'FastCGI Server Configuration Bindings' },
                                { key: 'upstream', label: 'Upstream Node DNS Host checks' }
                            ].map((rule) => (
                                <label key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={enabledRules.includes(rule.key)}
                                        onChange={() => handleRuleToggle(rule.key)}
                                    />
                                    <span>{rule.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn-cyber primary" style={{ width: '100%', padding: '14px', marginTop: '10px' }} disabled={saving}>
                        <Save size={16} /> {saving ? 'Initializing Control Plane...' : 'Initialize Control Plane & Bind Tools'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── OVERVIEW TAB ──
function OverviewTab({ metrics, isCritical, isHealthy, incident, liveLogs, resolveIncident, resolving, rolloutStep, error, loading }) {
    return (
        <>
            {/* Stats Row */}
            <div className="dash-stats animate-fade-up">
                <div className="dash-stat-card">
                    <div className="dash-stat-label">System Uptime</div>
                    <div className="dash-stat-value green">99.98%</div>
                    <div className="dash-stat-sub">Last 30 days</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-label">Active Load</div>
                    <div className="dash-stat-value">{metrics.traffic} req/s</div>
                    <div className="dash-stat-sub">Incoming requests</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-label">CPU Capacity</div>
                    <div className="dash-stat-value">{metrics.cpu}%</div>
                    <div className="dash-stat-sub">Server load</div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-label">Incident Feed</div>
                    <div className={`dash-stat-value ${isCritical ? 'red' : 'green'}`}>
                        {isCritical ? '1 Active' : '0 Active'}
                    </div>
                    <div className="dash-stat-sub">{isCritical ? 'Action required' : 'System healthy'}</div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="status-card-cyber critical animate-fade-up">
                    <div className="status-header critical">
                        <AlertCircle size={20} />
                        <h2>System Error</h2>
                    </div>
                    <div className="status-body" style={{color: 'var(--red)'}}>
                        {error}
                    </div>
                </div>
            )}

            {/* Connecting/Loading State */}
            {!error && loading && !incident && (
                <div className="status-card-cyber animate-fade-up">
                    <div className="status-body" style={{ textAlign: 'center', color: 'var(--text)' }}>
                        Establishing connection to infrastructure...
                    </div>
                </div>
            )}

            {/* Operational Health State */}
            {!error && isHealthy && (
                <>
                    <div className="status-card-cyber healthy animate-fade-up delay-1">
                        <div className="status-header healthy">
                            <ShieldCheck size={20} />
                            <h2>All Systems Operational</h2>
                        </div>
                        <div className="status-body" style={{ color: 'var(--text)' }}>
                            No errors detected in the NGINX error log. Services are routing correctly.
                        </div>
                    </div>

                    <div className="status-card-cyber animate-fade-up delay-2">
                        <div className="status-header" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="dot healthy"></span>
                                <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live NGINX Access Log Stream</h2>
                            </div>
                        </div>
                        <div className="status-body">
                            <div className="cyber-log" style={{ color: '#86efac', maxHeight: '180px', overflowY: 'auto', marginBottom: 0, padding: '14px 18px', background: '#05070a' }}>
                                {liveLogs.map((log, index) => (
                                    <div key={index} style={{ marginBottom: '4px', opacity: 0.85 + (index / 20) }}>{log}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Critical Crash State */}
            {!error && isCritical && (
                <div className="status-card-cyber critical animate-fade-up delay-1">
                    <div className="status-header critical">
                        <AlertTriangle size={20} />
                        <h2>Incident Detected</h2>
                    </div>
                    <div className="status-body">
                        <div className="section-tag" style={{ color: 'var(--text-muted)' }}>Raw Crash Log</div>
                        <div className="cyber-log">{incident.log_snippet}</div>

                        <div className="section-tag" style={{ color: 'var(--green)' }}>AI Proposed Patch</div>
                        <div className="cyber-fix" style={{ marginBottom: '16px' }}>{incident.proposed_fix}</div>

                        {/* Staging Sandbox Dry-Run & Security Scan Info */}
                        {incident.verification && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sandbox Verification</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 500, marginTop: '4px' }}>{incident.verification.syntaxCheck}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Static Security Score</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-h)', fontWeight: 500, marginTop: '4px' }}>{incident.verification.securityScore}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Release Checksum Hash</div>
                                    <div style={{ fontSize: '13px', color: 'var(--blue)', fontFamily: 'var(--mono)', marginTop: '4px' }}>{incident.verification.configHash}</div>
                                </div>
                            </div>
                        )}

                        {/* Staged Rollout Visual Pipeline */}
                        {rolloutStep > 0 && (
                            <div className="status-card-cyber animate-fade-up" style={{ marginBottom: '24px', borderColor: 'var(--blue)', background: 'rgba(59, 130, 246, 0.02)' }}>
                                <div className="status-header" style={{ borderBottom: '1px solid var(--border)', padding: '14px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="dot healthy" style={{ background: 'var(--blue)', boxShadow: 'var(--blue-glow)' }}></span>
                                        <h2 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--blue)', fontWeight: 700 }}>Canary Deployment Stepper</h2>
                                    </div>
                                </div>
                                <div className="status-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', padding: '18px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: rolloutStep >= 1 ? 1 : 0.35 }}>
                                        <span style={{ color: rolloutStep > 1 ? 'var(--green)' : 'var(--blue)', fontWeight: 700 }}>
                                            {rolloutStep > 1 ? '✓' : '●'}
                                        </span>
                                        <span>Syntax Validation: <code>nginx -t -c sandbox.conf</code></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: rolloutStep >= 2 ? 1 : 0.35 }}>
                                        <span style={{ color: rolloutStep > 2 ? 'var(--green)' : rolloutStep === 2 ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 700 }}>
                                            {rolloutStep > 2 ? '✓' : rolloutStep === 2 ? '●' : '○'}
                                        </span>
                                        <span>Deploying configurations to canary node: <code>acre-node-us-east-02</code></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: rolloutStep >= 3 ? 1 : 0.35 }}>
                                        <span style={{ color: rolloutStep > 3 ? 'var(--green)' : rolloutStep === 3 ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 700 }}>
                                            {rolloutStep > 3 ? '✓' : rolloutStep === 3 ? '●' : '○'}
                                        </span>
                                        <span>Traffic Routing health checks probe...</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: rolloutStep >= 4 ? 1 : 0.35 }}>
                                        <span style={{ color: rolloutStep > 4 ? 'var(--green)' : rolloutStep === 4 ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 700 }}>
                                            {rolloutStep > 4 ? '✓' : rolloutStep === 4 ? '●' : '○'}
                                        </span>
                                        <span>Syncing state configs to primary production cluster</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            className="btn-cyber primary"
                            style={{ width: '100%', height: '48px', fontSize: '15px' }}
                            onClick={resolveIncident}
                            disabled={resolving}
                        >
                            {resolving ? 'Applying Patch...' : <><CheckCheck size={16}/> Apply Fix & Resolve Incident</>}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── INCIDENTS TAB ──
function IncidentsTab() {
    const history = [
        { id: 'INC-2045', log: '[emerg] 4815#0: unknown directive "proxy_paass" in /etc/nginx/default:14', time: 'Today, 14:02', status: 'Resolved' },
        { id: 'INC-2041', log: '[emerg] 1#1: unknown directive "fastcgi_pass" in /etc/nginx/nginx.conf:22', time: 'Yesterday, 03:35', status: 'Resolved' },
        { id: 'INC-1988', log: '[emerg] 1#1: host not found in upstream "dummy-app:5000" in /etc/nginx/nginx.conf:15', time: 'July 15, 10:17', status: 'Resolved' }
    ];

    return (
        <div className="status-card-cyber animate-fade-up">
            <div className="status-header">
                <h2>Incident History Log</h2>
            </div>
            <div className="status-body" style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-h)' }}>
                            <th style={{ padding: '16px 24px' }}>Incident ID</th>
                            <th style={{ padding: '16px 24px' }}>Error Details</th>
                            <th style={{ padding: '16px 24px' }}>Remediation Time</th>
                            <th style={{ padding: '16px 24px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((h, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                                <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--blue)' }}>{h.id}</td>
                                <td style={{ padding: '16px 24px', fontFamily: 'var(--mono)', fontSize: '12px' }}>{h.log}</td>
                                <td style={{ padding: '16px 24px' }}>{h.time}</td>
                                <td style={{ padding: '16px 24px' }}>
                                    <span style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                        {h.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── NODES TAB ──
function NodesTab() {
    const nodes = [
        { name: 'acre-node-us-east-01 (Primary)', status: 'Online', cpu: '4.2%', ram: '148MB / 1024MB', uptime: '4d 12h 31m' },
        { name: 'acre-node-us-east-02 (Standby)', status: 'Online', cpu: '1.1%', ram: '92MB / 1024MB', uptime: '4d 12h 29m' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {nodes.map((node, index) => (
                <div className="status-card-cyber healthy animate-fade-up" key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="status-header healthy">
                        <span className="dot healthy"></span>
                        <h2>{node.name}</h2>
                    </div>
                    <div className="status-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPU Load</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{node.cpu}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>RAM Capacity</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{node.ram}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Uptime</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)', marginTop: '4px' }}>{node.uptime}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Health</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>100%</div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── SETTINGS TAB ──
function SettingsTab({ config, saveConfig, saving, simulateCrash, simulating }) {
    const [nginxLogPath, setNginxLogPath] = useState(config.nginxLogPath || '');
    const [aiApiKey, setAiApiKey] = useState(config.aiApiKey || '');
    const [slackWebhook, setSlackWebhook] = useState(config.slackWebhook || '');
    const [enabledRules, setEnabledRules] = useState(config.enabledRules || []);

    const [simCrashType, setSimCrashType] = useState('proxy_paass');

    const handleRuleToggle = (ruleKey) => {
        setEnabledRules(prev => 
            prev.includes(ruleKey) 
                ? prev.filter(r => r !== ruleKey) 
                : [...prev, ruleKey]
        );
    };

    const handleSave = (e) => {
        e.preventDefault();
        saveConfig({
            nginxLogPath,
            aiApiKey,
            validationLevel: 'strict',
            slackWebhook,
            enabledRules
        });
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
            
            {/* System Configuration */}
            <div className="status-card-cyber animate-fade-up">
                <div className="status-header">
                    <h2>SRE Configuration</h2>
                </div>
                <div className="status-body">
                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label>Infrastructure Log Path</label>
                            <input 
                                type="text" 
                                value={nginxLogPath} 
                                onChange={(e) => setNginxLogPath(e.target.value)} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>AI Model Gateway Token</label>
                            <input 
                                type="text" 
                                value={aiApiKey} 
                                onChange={(e) => setAiApiKey(e.target.value)} 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label>ChatOps Notification Webhook</label>
                            <input 
                                type="text" 
                                value={slackWebhook} 
                                onChange={(e) => setSlackWebhook(e.target.value)} 
                            />
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h)', display: 'block', marginBottom: '10px' }}>
                                Active SRE Policy Rule Engine
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {[
                                    { key: 'typo', label: 'Directive Typo Rules (proxy_paass)' },
                                    { key: 'fastcgi_pass', label: 'FastCGI Server Bindings' },
                                    { key: 'upstream', label: 'Upstream Node DNS checks' }
                                ].map((rule) => (
                                    <label key={rule.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={enabledRules.includes(rule.key)}
                                            onChange={() => handleRuleToggle(rule.key)}
                                        />
                                        <span>{rule.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="btn-cyber primary" style={{ width: '100%' }} disabled={saving}>
                            <Save size={16} /> {saving ? 'Saving System Changes...' : 'Save Settings'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Crash Simulator Config */}
            <div className="status-card-cyber critical animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="status-header critical">
                    <AlertTriangle size={20} />
                    <h2>Crash Simulation Controller</h2>
                </div>
                <div className="status-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text)' }}>
                        Inject a simulated crash log into the active monitoring pipeline. Only enabled policy rules can be triggered.
                    </p>

                    <div className="form-group">
                        <label>Select Failure Target</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="crashSim" 
                                    checked={simCrashType === 'proxy_paass'}
                                    onChange={() => setSimCrashType('proxy_paass')}
                                />
                                <span>Directive Typo Error (needs 'typo' rule active)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="crashSim" 
                                    checked={simCrashType === 'fastcgi_pass'}
                                    onChange={() => setSimCrashType('fastcgi_pass')}
                                />
                                <span>FastCGI directive context violation (needs 'fastcgi_pass' active)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                                <input 
                                    type="radio" 
                                    name="crashSim" 
                                    checked={simCrashType === 'upstream'}
                                    onChange={() => setSimCrashType('upstream')}
                                />
                                <span>DNS resolution error on upstream host (needs 'upstream' active)</span>
                            </label>
                        </div>
                    </div>

                    <button 
                        className="btn-cyber" 
                        onClick={() => simulateCrash(simCrashType)} 
                        disabled={simulating}
                        style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
                    >
                        {simulating ? 'Injecting Crash...' : 'Simulate Crash Log'}
                    </button>
                </div>
            </div>

        </div>
    );
}

export default DashboardPage;
