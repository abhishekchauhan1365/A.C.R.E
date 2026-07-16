import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Cpu, AlertCircle, Loader2 } from 'lucide-react';

function SignupPage() {
    const [name, setName]               = useState('');
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [confirm, setConfirm]         = useState('');
    const [error, setError]             = useState('');
    const [loading, setLoading]         = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            return setError('Passwords do not match.');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }

        setLoading(true);

        try {
            const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await axios.post(`${API}/api/auth/signup`, { name, email, password });

            localStorage.setItem('acre_token', res.data.token);
            localStorage.setItem('acre_user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try again.');
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
                        Secure your infrastructure.
                    </h1>
                    <p className="auth-left-desc">
                        Join top engineering teams who trust A.C.R.E. to monitor, diagnose, and auto-remediate infrastructure crashes in real-time.
                    </p>
                </div>
            </div>

            {/* ── Right Pane (Auth Form) ── */}
            <div className="auth-right">
                <div className="auth-card animate-fade-up delay-2">
                    
                    <div className="auth-mobile-brand" onClick={() => navigate('/')}>
                        <Cpu size={24} /> A.C.R.E.
                    </div>

                    <h2 className="auth-title">Create account</h2>
                    <p className="auth-subtitle">Get started with autonomous infrastructure today</p>

                    {error && (
                        <div className="auth-error animate-fade-up">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="name">Full name</label>
                            <input
                                id="name"
                                type="text"
                                placeholder="Sarah Connor"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">Email address</label>
                            <input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm">Confirm password</label>
                            <input
                                id="confirm"
                                type="password"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-auth" disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin-icon" /> : 'Create account'}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Already have an account? 
                        <Link to="/login">Sign in here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
