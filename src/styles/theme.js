import { hex2rgba } from '@utils';

const ACCENT = '#64ffda';
const DARK_BG = '#0a192f';
const DARK_BG_DEEP = '#020c1b';

// Shared non-color properties
const shared = {
  fonts: {
    Calibre:
      'Calibre, San Francisco, SF Pro Text, -apple-system, system-ui, BlinkMacSystemFont, Roboto, Helvetica Neue, Segoe UI, Arial, sans-serif',
    SFMono: 'SF Mono, Fira Code, Fira Mono, Roboto Mono, Lucida Console, Monaco, monospace',
  },

  fontSizes: {
    xs: '12px',
    smish: '13px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '22px',
    h3: '32px',
  },

  easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  transition: 'all 0.25s cubic-bezier(0.645, 0.045, 0.355, 1)',

  borderRadius: '6px',
  navHeight: '100px',
  navScrollHeight: '70px',
  margin: '20px',

  tabHeight: 42,
  tabWidth: 120,
  radius: 6,

  hamburgerWidth: 30,
  hamBefore: `top 0.1s ease-in 0.25s, opacity 0.1s ease-in`,
  hamBeforeActive: `top 0.1s ease-out, opacity 0.1s ease-out 0.12s`,
  hamAfter: `bottom 0.1s ease-in 0.25s, transform 0.22s cubic-bezier(0.55, 0.055, 0.675, 0.19)`,
  hamAfterActive: `bottom 0.1s ease-out, transform 0.22s cubic-bezier(0.215, 0.61, 0.355, 1) 0.12s`,

  navDelay: 1000,
  loaderDelay: 2000,
};

// Dark theme colors
const darkColors = {
  darkNavy: DARK_BG_DEEP,
  navy: DARK_BG,
  lightNavy: '#112240',
  lightestNavy: '#233554',
  slate: '#8892b0',
  lightSlate: '#a8b2d1',
  lightestSlate: '#ccd6f6',
  white: '#e6f1ff',
  green: ACCENT,
  transGreen: hex2rgba(ACCENT, 0.07),
  shadowNavy: hex2rgba(DARK_BG_DEEP, 0.7),
};

// Light theme colors
const lightColors = {
  darkNavy: '#f0f4f8',
  navy: '#ffffff',
  lightNavy: '#f1f5f9',
  lightestNavy: '#e2e8f0',
  slate: '#475569',
  lightSlate: '#334155',
  lightestSlate: '#0f172a',
  white: '#0f172a',
  green: '#0ea5e9',
  transGreen: hex2rgba('#0ea5e9', 0.07),
  shadowNavy: hex2rgba('#94a3b8', 0.15),
};

// Default theme (dark) - used by components that import theme directly
const theme = {
  ...shared,
  colors: darkColors,
};

// Named theme objects for ThemeProvider
export const darkTheme = {
  ...shared,
  mode: 'dark',
  colors: darkColors,
};

export const lightTheme = {
  ...shared,
  mode: 'light',
  colors: lightColors,
};

export default theme;
