import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, RefreshCcw, CheckCircle2 } from 'lucide-react';

function ComparisonCards() {
    return (
        <section className="comparison-section" id="comparison">
            <h2 style={{ textAlign: 'center', fontSize: '32px', marginBottom: '16px' }}>The Evolution of Incident Response</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
                Stop relying on pager alerts and manual SSH sessions. Let AI handle the first-responder triage automatically.
            </p>
            
            <div className="comparison-grid">
                {/* Traditional SRE */}
                <motion.div 
                    className="comp-card old-way"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="comp-header">
                        <AlertTriangle color="var(--text-muted)" />
                        <h3>Traditional SRE</h3>
                    </div>
                    <ul className="comp-list">
                        <li><span className="cross">✕</span> PagerDuty wakes on-call engineer at 3 AM</li>
                        <li><span className="cross">✕</span> Engineer manually connects to VPN & SSH</li>
                        <li><span className="cross">✕</span> Grep through gigabytes of unstructured logs</li>
                        <li><span className="cross">✕</span> Guess the syntax for the hotfix</li>
                        <li><span className="cross">✕</span> Restart service and pray</li>
                    </ul>
                    <div className="comp-time">
                        <Clock size={16} /> Average Resolution: 45 Minutes
                    </div>
                </motion.div>
                
                {/* A.C.R.E. Way */}
                <motion.div 
                    className="comp-card new-way"
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <div className="comp-header">
                        <RefreshCcw color="var(--blue)" />
                        <h3 style={{ color: 'var(--blue)' }}>A.C.R.E. Workflow</h3>
                    </div>
                    <ul className="comp-list">
                        <li><span className="check">✓</span> Kernel daemon intercepts crash signal instantly</li>
                        <li><span className="check">✓</span> Trace dispatched to deterministic LLM</li>
                        <li><span className="check">✓</span> Patch generated and sandbox-validated</li>
                        <li><span className="check">✓</span> Hot-swapped into production memory</li>
                        <li><span className="check">✓</span> Engineer reviews audit log in the morning</li>
                    </ul>
                    <div className="comp-time success">
                        <CheckCircle2 size={16} /> Average Resolution: 4 Seconds
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

export default ComparisonCards;
