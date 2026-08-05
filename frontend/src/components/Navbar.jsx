import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function Navbar() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="nav-ent">
            <div className="brand-ent" onClick={() => navigate('/')}>
                <Cpu size={24} color="var(--blue)" /> A.C.R.E.
            </div>
            
            <div className={`nav-links ${mobileOpen ? 'mobile-open' : ''}`}>
                <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
                <a href="#comparison" onClick={() => setMobileOpen(false)}>Compare</a>
                <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
            </div>
            
            <div className="nav-actions">
                <button 
                    className="btn-ent icon-only" 
                    onClick={toggleTheme} 
                    aria-label="Toggle Theme"
                    style={{ padding: '10px' }}
                >
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button className="btn-ent hide-mobile" onClick={() => navigate('/login')}>Log In</button>
                <button className="btn-ent primary hide-mobile" onClick={() => navigate('/signup')}>Get Started</button>
                
                <button 
                    className="btn-ent icon-only show-mobile" 
                    onClick={() => setMobileOpen(!mobileOpen)}
                    style={{ padding: '10px' }}
                >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
