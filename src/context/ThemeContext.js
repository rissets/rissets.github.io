import React, { createContext, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

const ThemeContext = createContext({
  isDarkMode: true,
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeContextProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Check localStorage first, then system preference
    const stored = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (stored !== null) {
      setIsDarkMode(stored === 'true');
    } else if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkMode', String(next));
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>
  );
};

ThemeContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeContext;
