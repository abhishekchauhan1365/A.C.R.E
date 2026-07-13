import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, AlertTriangle, RefreshCw, Cpu, AlertCircle, CheckCheck, LogOut } from 'lucide-react';

function DashboardPage() {
    const [incident, setIncident]   = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [resolving, setResolving] = useState(false);

    const navigate = useNavigate();

    // Read stored user info to display their name in the topbar
    const user = JSON.parse(localStorage.getItem('acre_user') || '{}');

    // Build the auth header — this is sent with every request to the backend.
    // The backend's requireAuth middleware reads this and verifies the token.
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const authHeader = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('acre_token')}` }
    });

    const fetchStatus = async () => {
        setLoading(true);
        try {
            // Note: authHeader() is now passed as the 2nd argument to axios.get
            const response = await axios.get(`${API}/api/incident`, authHeader());
            setIncident(response.data);
            setError('');
        } catch (err) {
            // If the backend returns 401, the token is expired — force logout
            if (err.response?.status === 401) {
                handleLogout();
            } else {
                setError('Cannot reach A.C.R.E. Control Server. Make sure the backend is running on port 8000.');
            }
        }
        setLoading(false);
    };

    const resolveIncident = async () => {
        setResolving(true);
        try {
            await axios.post(`${API}/api/resolve`, {}, authHeader());
            await fetchStatus();
        } catch (err) {
            if (err.response?.status === 401) handleLogout();
            else setError('Failed to resolve the incident. Check backend connection.');
        }
        setResolving(false);
    };

    // Logout: wipe localStorage, stop polling, send user to login page
    const handleLogout = () => {
        localStorage.removeItem('acre_token');
        localStorage.removeItem('acre_user');
        navigate('/login');
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval); // cleanup: stop polling when component unmounts
    }, []);

    const isCritical = incident?.status === 'CRITICAL';
    const isHealthy  = incident?.status === 'HEALTHY';
    const dotClass   = error ? 'dot' : loading && !incident ? 'dot loading' : isCritical ? 'dot critical' : 'dot healthy';
    const dotLabel   = error ? 'Offline' : loading && !incident ? 'Connecting' : isCritical ? 'Critical' : 'Healthy';

    return (
        <div className="app">

            {/* ── Topbar ── */}
            <header className="topbar">
                <div className="topbar-brand">
                    <Cpu size={16} />
                    A.C.R.E.
                </div>

                <div className="topbar-right">
                    <div className="status-dot">
                        <span className={dotClass}></span>
                        {dotLabel}
                    </div>

                    <button
                        id="btn-refresh"
                        className={`btn-refresh ${loading ? 'spinning' : ''}`}
                        onClick={fetchStatus}
                        disabled={loading}
                    >
                        <RefreshCw size={12} />
                        {loading ? 'Scanning…' : 'Refresh'}
                    </button>

                    {/* Show user's name + logout button */}
                    {user.name && (
                        <span className="topbar-user">{user.name}</span>
                    )}

                    <button className="btn-logout" onClick={handleLogout} title="Logout">
                        <LogOut size={14} />
                        Logout
                    </button>
                </div>
            </header>

            {/* ── Main content ── */}
            <main className="main">
                <div className="page-header">
                    <h1 className="page-title">Infrastructure Monitor</h1>
                    <p className="page-subtitle">Polling every 5 s · NGINX error log · AI-assisted remediation</p>
                </div>

                {error && (
                    <div className="error-banner" role="alert">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {!error && loading && !incident && (
                    <div className="loading-state">
                        <div className="loader-ring"></div>
                        <span>Establishing connection to infrastructure…</span>
                    </div>
                )}

                {!error && isHealthy && (
                    <div className="status-card healthy">
                        <div className="status-card-header">
                            <div className="status-icon healthy"><ShieldCheck size={18} /></div>
                            <div>
                                <div className="status-label">All Systems Operational</div>
                                <div className="status-desc">No errors detected in the NGINX error log.</div>
                            </div>
                        </div>
                        <div className="status-card-body">
                            <div className="healthy-body">
                                <ShieldCheck size={14} />
                                Services are routing correctly. No action required.
                            </div>
                        </div>
                    </div>
                )}

                {!error && isCritical && (
                    <div className="status-card critical">
                        <div className="status-card-header">
                            <div className="status-icon critical"><AlertTriangle size={18} /></div>
                            <div>
                                <div className="status-label">Incident Detected — Manual Review Required</div>
                                <div className="status-desc">AI has analysed the crash and proposed a fix below.</div>
                            </div>
                        </div>
                        <div className="status-card-body">
                            <div className="section-label">Raw NGINX crash log</div>
                            <div className="log-block" role="log">{incident.log_snippet}</div>

                            <div className="section-label">AI-proposed fix</div>
                            <div className="fix-block" role="region">{incident.proposed_fix}</div>

                            <button
                                id="btn-resolve"
                                className={`btn-resolve ${resolving ? 'resolving' : ''}`}
                                onClick={resolveIncident}
                                disabled={resolving}
                            >
                                {resolving
                                    ? <><RefreshCw size={14} className="spin-icon" /> Resolving…</>
                                    : <><CheckCheck size={14} /> Apply Fix &amp; Resolve Incident</>
                                }
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <footer className="footer">
                A.C.R.E. · Autonomous Crash Recovery Engine · powered by Llama 3.2 via Ollama
            </footer>
        </div>
    );
}

export default DashboardPage;
