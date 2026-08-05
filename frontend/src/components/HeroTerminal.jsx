import React, { useState, useEffect, useRef } from 'react';

function HeroTerminal() {
    const [lines, setLines] = useState([
        { type: 'cmd', text: '$ tail -f /var/log/nginx/error.log' },
        { type: 'log', text: '[2026/08/02 14:32:01] [emerg] unknown directive "proxy_paass" in /etc/nginx/sites-enabled/default:14' }
    ]);
    const [isIntercepting, setIsIntercepting] = useState(false);
    const endRef = useRef(null);

    const runIntercept = () => {
        if (isIntercepting) return;
        setIsIntercepting(true);
        setLines(prev => [...prev, { type: 'cmd', text: '$ acrectl intercept --daemon' }]);
        
        setTimeout(() => setLines(prev => [...prev, { type: 'info', text: '[INFO] Incident INC-4029 intercepted.' }]), 800);
        setTimeout(() => setLines(prev => [...prev, { type: 'info', text: '[INFO] Dispatching crash trace to Groq (llama-3.3-70b-versatile)...' }]), 1600);
        setTimeout(() => setLines(prev => [...prev, { type: 'success', text: '[SUCCESS] Sandbox syntax validation passed. Promoting configuration to production.' }]), 3200);
        setTimeout(() => setIsIntercepting(false), 3300);
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    return (
        <div className="graphic-window">
            <div className="graphic-header">
                <div style={{ display: 'flex', gap: '6px' }}>
                    <div className="mac-dot r"></div>
                    <div className="mac-dot y"></div>
                    <div className="mac-dot g"></div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 auto', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    bash - acrectl
                    <button 
                        className="btn-ent" 
                        style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }} 
                        onClick={runIntercept}
                        disabled={isIntercepting}
                    >
                        {isIntercepting ? 'Running...' : '▶ Run Patch'}
                    </button>
                </div>
            </div>
            <div className="graphic-body" style={{ minHeight: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                {lines.map((line, i) => (
                    <div key={i} style={{ marginBottom: line.type === 'cmd' ? '12px' : '4px', marginTop: line.type === 'cmd' && i > 0 ? '24px' : '0' }}>
                        {line.type === 'cmd' && <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}></span>}
                        <span style={{
                            color: line.type === 'log' ? 'var(--text)' : 
                                   line.type === 'cmd' ? 'var(--blue)' : 
                                   line.type === 'info' ? 'var(--text-h)' : 
                                   line.type === 'success' ? 'var(--green)' : 'inherit'
                        }}>
                            {line.type === 'log' && <span style={{ color: 'var(--red)' }}>[emerg]</span>}
                            {line.type === 'log' ? line.text.replace('[emerg]', '') : line.text}
                        </span>
                    </div>
                ))}
                {isIntercepting && (
                    <div style={{ marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>_</span>
                    </div>
                )}
                <div ref={endRef} />
            </div>
        </div>
    );
}

export default HeroTerminal;
