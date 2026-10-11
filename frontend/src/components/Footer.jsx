import { Cpu } from 'lucide-react';

function Footer() {
    return (
        <footer className="footer-ent">
            <div className="footer-grid">
                <div className="footer-brand">
                    <div className="brand-ent">
                        <Cpu size={24} color="var(--blue)" /> A.C.R.E.
                    </div>
                    <p>Autonomous SRE control plane powered by deterministic AI. Built for next-generation reliability.</p>
                </div>
                <div className="footer-col">
                    <div className="footer-col-title">Product</div>
                    <div className="footer-col-links">
                        <a href="#features">Features</a>
                        <a href="#">Integrations</a>
                        <a href="#">Pricing</a>
                        <a href="#">Changelog</a>
                    </div>
                </div>
                <div className="footer-col">
                    <div className="footer-col-title">Resources</div>
                    <div className="footer-col-links">
                        <a href="#">Documentation</a>
                        <a href="#">API Reference</a>
                        <a href="#">Community</a>
                        <a href="#">Blog</a>
                    </div>
                </div>
                <div className="footer-col">
                    <div className="footer-col-title">Company</div>
                    <div className="footer-col-links">
                        <a href="#">About</a>
                        <a href="#">Careers</a>
                        <a href="#">Legal</a>
                        <a href="#">Contact</a>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <div>© 2026 Autonomous Crash Recovery Engine.</div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <a href="#" style={{ color: 'var(--text-muted)' }}>Twitter</a>
                    <a href="#" style={{ color: 'var(--text-muted)' }}>GitHub</a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
