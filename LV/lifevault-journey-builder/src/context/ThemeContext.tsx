// file: src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme] = useState<Theme>('light');

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        localStorage.setItem('blockpix-theme', 'light');
    }, []);

    const toggleTheme = useCallback(() => {
        // No-op manually disabled
        console.log('Theme toggle disabled: Light mode only');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark: false }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
