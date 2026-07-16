import { useNavigate } from 'react-router-dom';
import { Cpu, Zap, Eye, ArrowRight, ShieldCheck, GitMerge, Terminal } from 'lucide-react';

const features = [
    {
        icon: <Eye size={22} />,
        title: 'Real-Time Monitor',
        desc: 'Continuously watches your NGINX error logs every 5 seconds. No setup, no agents — just connect and go.',
    },
    {
        icon: <Cpu size={22} />,
        title: 'AI-Powered Analysis',
        desc: 'Llama 3.3 via Groq diagnoses the root cause of every crash in under a second with zero hallucination.',
    },
    {
        icon: <Zap size={22} />,
        title: 'One-Click Resolution',
        desc: 'Apply the AI-proposed patch instantly. One click clears the incident and heals your infrastructure.',
    },
];

const stats = [
    { value: '99.9%', label: 'Guaranteed Uptime SLA' },
    { value: '< 5s',  label: 'Crash Detection Time'  },
    { value: '1-Click', label: 'Incident Resolution'  },
    { value: '0',     label: 'Manual Steps Required' },
];

const steps = [
    {
        n: '01',
        title: 'Connect Your Infrastructure',
        desc: 'Point A.C.R.E. at your NGINX error log file. No agents, no SDKs, no code changes on your server.',
    },
    {
        n: '02',
        title: 'Crash is Detected Automatically',
        desc: 'The engine polls every 5 seconds. The moment a fatal error appears, the status flips to CRITICAL.',
    },
    {
        n: '03',
        title: 'AI Diagnoses the Root Cause',
        desc: 'The full error log is sent to Llama 3.3. Within 1–2 seconds it returns the exact NGINX config fix.',
    },
];

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-cyber">
            <div className="tech-grid"></div>

            {/* ── Nav ── */}
            <nav className="landing-nav animate-fade-up">
                <div className="landing-brand" onClick={() => navigate('/')}>
                    <Cpu size={22} /> A.C.R.E.
                </div>
                <div className="landing-actions">
                    <button className="btn-cyber" onClick={() => navigate('/login')}>Log in</button>
                    <button className="btn-cyber primary" onClick={() => navigate('/signup')}>
                        Start Engine <ArrowRight size={15} />
                    </button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="hero-cyber animate-fade-up delay-1">
                <div className="hero-badge">
                    <span className="dot healthy"></span>
                    AI-powered · Local Execution · Zero Cloud Dependency
                </div>

                <h1 className="hero-title">
                    Your infra fixes itself.<br />
                    <span>Before you wake up.</span>
                </h1>

                <p className="hero-desc">
                    A.C.R.E. monitors your server, detects crashes in real time,
                    and uses Llama 3.3 to diagnose and deploy the exact configuration patch automatically.
                </p>

                <div className="landing-actions">
                    <button className="btn-cyber primary" onClick={() => navigate('/signup')}>
                        Deploy Free <ArrowRight size={15} />
                    </button>
                    <button className="btn-cyber" onClick={() => navigate('/login')}>
                        Enter Terminal
                    </button>
                </div>
            </section>

            {/* ── Stats Bar ── */}
            <div className="stats-bar animate-fade-up delay-2">
                {stats.map((s) => (
                    <div className="stat-item" key={s.label}>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Features ── */}
            <section className="features-cyber animate-fade-up delay-3">
                {features.map((f) => (
                    <div className="feature-card-cyber" key={f.title}>
                        <div className="icon-wrap">{f.icon}</div>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                    </div>
                ))}
            </section>

            {/* ── How It Works ── */}
            <section className="how-section animate-fade-up delay-3">
                <div className="section-header">
                    <div className="section-eyebrow">How it works</div>
                    <h2 className="section-title">From crash to recovery<br />in under 10 seconds</h2>
                    <p className="section-desc">
                        A.C.R.E. replaces an entire on-call rotation with a deterministic AI pipeline that never sleeps.
                    </p>
                </div>

                <div className="how-grid">
                    {/* Steps */}
                    <div className="how-steps">
                        {steps.map((s) => (
                            <div className="how-step" key={s.n}>
                                <div className="step-num">{s.n}</div>
                                <div className="step-text">
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mock Terminal */}
                    <div className="mock-terminal">
                        <div className="terminal-bar">
                            <span className="t-dot r"></span>
                            <span className="t-dot y"></span>
                            <span className="t-dot g"></span>
                            <span className="terminal-title">acre-engine · live feed</span>
                        </div>
                        <div className="terminal-body">
                            <div className="t-line">
                                <span className="t-ts">09:14:01</span>
                                <span className="t-dim">polling /var/log/nginx/error.log…</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:06</span>
                                <span className="t-red">🚨 CRITICAL — unknown directive "proxy_paass"</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:06</span>
                                <span className="t-blue">🤖 dispatching to Llama 3.3 via Groq…</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:07</span>
                                <span className="t-dim">AI latency: 812ms</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:07</span>
                                <span className="t-green">✅ patch ready — "proxy_pass" on line 14</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:09</span>
                                <span className="t-green">✅ incident resolved — log cleared</span>
                            </div>
                            <div className="t-line">
                                <span className="t-ts">09:14:09</span>
                                <span className="t-dim">total remediation time: </span>
                                <span className="t-white">8.2s</span>
                            </div>
                            <div className="t-line" style={{ marginTop: '8px' }}>
                                <span className="t-ts">09:14:14</span>
                                <span className="t-dim">polling /var/log/nginx/error.log…&nbsp;</span>
                                <span className="t-cursor"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="animate-fade-up" style={{
                margin: '0 48px 80px',
                padding: '64px',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                background: 'var(--bg-card)',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)',
            }}>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--text-h)', letterSpacing: '-1px', marginBottom: '16px' }}>
                    Your infrastructure never sleeps.<br />
                    <span style={{ background: 'linear-gradient(135deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Neither does A.C.R.E.
                    </span>
                </h2>
                <p style={{ color: 'var(--text)', fontSize: '17px', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
                    Stop waking up at 3am. Deploy A.C.R.E. in 60 seconds, free forever.
                </p>
                <button className="btn-cyber primary" style={{ padding: '14px 32px', fontSize: '16px' }} onClick={() => navigate('/signup')}>
                    Get Started for Free <ArrowRight size={17} />
                </button>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                A.C.R.E. · Autonomous Crash Recovery Engine · Powered by Llama 3.3 via Groq
            </footer>
        </div>
    );
}

export default LandingPage;
