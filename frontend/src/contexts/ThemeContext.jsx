import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Check local storage or default to 'light' (as per the user's preference)
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('acre_theme');
        return saved || 'light';
    });

    useEffect(() => {
        localStorage.setItem('acre_theme', theme);
        // Apply the theme to the root body element so CSS variables switch globally
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
