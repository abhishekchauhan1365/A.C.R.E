import { Activity, ShieldCheck, Zap } from 'lucide-react';

function FeatureGrid() {
    const handleMouseMove = (e) => {
        const { currentTarget, clientX, clientY } = e;
        const { left, top } = currentTarget.getBoundingClientRect();
        currentTarget.style.setProperty('--mouse-x', `${clientX - left}px`);
        currentTarget.style.setProperty('--mouse-y', `${clientY - top}px`);
    };

    return (
        <section className="features-section" id="features" style={{ perspective: '1400px', perspectiveOrigin: '50% 0%' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <span className="pill-badge">AGENT TYPES</span>
                <h2 style={{ fontSize: '48px', fontWeight: 300, marginTop: '16px', letterSpacing: '-0.03em' }}>
                    Plug-and-play agents<br/>ready to deploy.
                </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ position: 'sticky', top: '100px', zIndex: 10 }}>
                    <div className="feature-card sticky-card" onMouseMove={handleMouseMove}>
                        <div className="feature-content" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                            <div className="feature-icon" style={{ padding: '24px', background: 'var(--bg-subtle)', borderRadius: '16px' }}>
                                <Activity size={48} color="var(--text)" />
                            </div>
                            <div>
                                <span className="font-pixel text-muted" style={{ fontSize: '11px', letterSpacing: '0.2em' }}>01 / DETECTOR</span>
                                <h3 style={{ fontSize: '28px', fontWeight: 300, margin: '8px 0' }}>Millisecond Detection</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '16px' }}>
                                    Daemon-level hooks detect configuration panics before they propagate to dependent microservices. Real-time monitoring of all cluster traffic.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ position: 'sticky', top: '120px', zIndex: 11 }}>
                    <div className="feature-card sticky-card" onMouseMove={handleMouseMove}>
                        <div className="feature-content" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                            <div className="feature-icon" style={{ padding: '24px', background: 'var(--bg-subtle)', borderRadius: '16px' }}>
                                <Zap size={48} color="var(--text)" />
                            </div>
                            <div>
                                <span className="font-pixel text-muted" style={{ fontSize: '11px', letterSpacing: '0.2em' }}>02 / ANALYST</span>
                                <h3 style={{ fontSize: '28px', fontWeight: 300, margin: '8px 0' }}>Deterministic AI</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '16px' }}>
                                    Powered by Groq's Llama 3.3. Synthesizes safe configuration patches with mathematically guaranteed syntax validity in milliseconds.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style={{ position: 'sticky', top: '140px', zIndex: 12 }}>
                    <div className="feature-card sticky-card" onMouseMove={handleMouseMove}>
                        <div className="feature-content" style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                            <div className="feature-icon" style={{ padding: '24px', background: 'var(--bg-subtle)', borderRadius: '16px' }}>
                                <ShieldCheck size={48} color="var(--text)" />
                            </div>
                            <div>
                                <span className="font-pixel text-muted" style={{ fontSize: '11px', letterSpacing: '0.2em' }}>03 / EXECUTOR</span>
                                <h3 style={{ fontSize: '28px', fontWeight: 300, margin: '8px 0' }}>Zero-Downtime Sandbox</h3>
                                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '16px' }}>
                                    Patches are compiled and tested in an isolated memory space. The main thread is never blocked during hot-swapping.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default FeatureGrid;
