import { useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, Zap, Eye } from 'lucide-react';

// The 3 feature cards shown on the landing page
const features = [
    {
        icon: <Eye size={20} />,
        title: 'Monitor',
        desc: 'Continuously watches your NGINX error logs in real time. No setup, no agents — just connect and go.',
    },
    {
        icon: <Cpu size={20} />,
        title: 'Analyse',
        desc: 'When a crash is detected, a local AI model (Llama 3.2) diagnoses the root cause instantly.',
    },
    {
        icon: <Zap size={20} />,
        title: 'Resolve',
        desc: 'One click applies the AI-proposed fix and clears the incident — your infra heals itself.',
    },
];

function LandingPage() {
    // useNavigate lets us redirect to another page programmatically
    const navigate = useNavigate();

    return (
        <div className="landing">

            {/* ── Top nav bar ── */}
            <nav className="landing-nav">
                <div className="landing-brand">
                    <Cpu size={16} />
                    A.C.R.E.
                </div>
                <div className="landing-nav-actions">
                    <button className="btn-ghost" onClick={() => navigate('/login')}>
                        Log in
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/signup')}>
                        Get Started
                    </button>
                </div>
            </nav>

            {/* ── Hero section ── */}
            <section className="hero">
                {/* Small badge above the title */}
                <div className="hero-badge">
                    <span className="dot healthy"></span>
                    AI-powered · Runs locally · No cloud required
                </div>

                <h1 className="hero-title">
                    Your infra fixes itself.<br />
                    <span className="hero-gradient">Before you wake up.</span>
                </h1>

                <p className="hero-subtitle">
                    A.C.R.E. monitors your NGINX server, detects crashes in real time,
                    and uses a local AI model to diagnose and propose the exact fix —
                    all without sending your data anywhere.
                </p>

                <div className="hero-actions">
                    <button className="btn-primary btn-lg" onClick={() => navigate('/signup')}>
                        Get Started — it's free
                    </button>
                    <button className="btn-ghost btn-lg" onClick={() => navigate('/login')}>
                        Already have an account?
                    </button>
                </div>
            </section>

            {/* ── Feature cards ── */}
            <section className="features">
                {features.map((f) => (
                    <div className="feature-card" key={f.title}>
                        <div className="feature-icon">{f.icon}</div>
                        <h3 className="feature-title">{f.title}</h3>
                        <p className="feature-desc">{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                A.C.R.E. · Autonomous Crash Recovery Engine · powered by Llama 3.2 via Ollama
            </footer>
        </div>
    );
}

export default LandingPage;
