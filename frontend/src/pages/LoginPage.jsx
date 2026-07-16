import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Cpu, AlertCircle, Loader2 } from 'lucide-react';

function LoginPage() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await axios.post(`${API}/api/auth/login`, { email, password });

            localStorage.setItem('acre_token', res.data.token);
            localStorage.setItem('acre_user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Incorrect email or password.');
        }

        setLoading(false);
    };

    return (
        <div className="auth-split">
            {/* ── Left Pane (Marketing/Brand) ── */}
            <div className="auth-left">
                <div className="auth-left-content animate-fade-up">
                    <div className="auth-left-brand" onClick={() => navigate('/')}>
                        <Cpu />
                        A.C.R.E.
                    </div>
                    <h1 className="auth-left-title">
                        Welcome back to the Control Server.
                    </h1>
                    <p className="auth-left-desc">
                        Sign in to monitor your infrastructure, review critical crash logs, and deploy deterministic AI-generated configuration patches instantly.
                    </p>
                </div>
            </div>

            {/* ── Right Pane (Auth Form) ── */}
            <div className="auth-right">
                <div className="auth-card animate-fade-up delay-2">
                    
                    <div className="auth-mobile-brand" onClick={() => navigate('/')}>
                        <Cpu size={24} /> A.C.R.E.
                    </div>

                    <h2 className="auth-title">Sign in</h2>
                    <p className="auth-subtitle">Enter your credentials to access your dashboard</p>

                    {error && (
                        <div className="auth-error animate-fade-up">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <div className="form-group-header">
                                <label htmlFor="password">Password</label>
                                <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                            </div>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin-icon" /> : 'Sign in'}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? 
                        <Link to="/signup">Create one now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
