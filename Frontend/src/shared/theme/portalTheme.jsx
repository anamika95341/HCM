import React, { createContext, useContext } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

export const LIGHT_THEME = {
  bg: "#f5f5f5",
  bgElevated: "#ffffff",
  card: "#ffffff",
  cardHover: "#fafafa",
  border: "#e5e5e5",
  borderLight: "#ebebeb",
  purple: "#7c3aed",
  purpleDim: "rgba(124,58,237,0.12)",
  mint: "#059669",
  mintDim: "rgba(5,150,105,0.12)",
  t1: "#171717",
  t2: "#525252",
  t3: "#737373",
  inp: "#fafafa",
  danger: "#dc2626",
  warn: "#d97706",
  success: "#059669",
  scrollbar: "#d4d4d4",
  scrollbarHover: "#a3a3a3",
  navHover: "rgba(0,0,0,0.04)",
};

const PortalThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  C: LIGHT_THEME,
});

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

export function PortalThemeProvider({ children }) {
  const value = {
    theme: "light",
    setTheme: () => {},
    C: LIGHT_THEME,
  };

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function PortalGlobalStyles() {
  const { C } = usePortalTheme();

  const styles = `
    @import url('${FONT_URL}');
    :root {
      color-scheme: light;
      --portal-bg: ${C.bg};
      --portal-bg-elevated: ${C.bgElevated};
      --portal-card: ${C.card};
      --portal-card-hover: ${C.cardHover};
      --portal-border: ${C.border};
      --portal-border-light: ${C.borderLight};
      --portal-purple: ${C.purple};
      --portal-purple-dim: ${C.purpleDim};
      --portal-mint: ${C.mint};
      --portal-mint-dim: ${C.mintDim};
      --portal-text-strong: ${C.t1};
      --portal-text: ${C.t2};
      --portal-text-muted: ${C.t3};
      --portal-input: ${C.inp};
      --portal-danger: ${C.danger};
      --portal-warn: ${C.warn};
      --portal-scrollbar: ${C.scrollbar};
      --portal-scrollbar-hover: ${C.scrollbarHover};
      --portal-nav-hover: ${C.navHover};
      --portal-shadow: 0 24px 80px rgba(15,23,42,0.08);
      --portal-shadow-sm: 0 8px 20px rgba(15,23,42,0.05);
      --portal-radius-lg: 16px;
    }

    html, body, #root {
      min-height: 100%;
      background: ${C.bg};
    }

    html, body, #root,
    button, input, select, textarea {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: ${C.t1};
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      background:
        radial-gradient(circle at top left, rgba(124,58,237,0.08) 0, transparent 28%),
        radial-gradient(circle at top right, rgba(5,150,105,0.06) 0, transparent 22%),
        ${C.bg};
    }

    *, *::before, *::after { box-sizing: border-box; }

    ::selection {
      background: ${C.purpleDim};
      color: ${C.t1};
    }

    * {
      scrollbar-width: thin;
      scrollbar-color: ${C.scrollbar} transparent;
    }

    *::-webkit-scrollbar { width: 6px; height: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb {
      background: ${C.scrollbar};
      border-radius: 999px;
    }
    *::-webkit-scrollbar-thumb:hover { background: ${C.scrollbarHover}; }

    button, input, select, textarea {
      font-family: inherit;
    }

    .portal-shell {
      min-height: 100vh;
      background: transparent;
      color: ${C.t1};
    }

    .portal-shell,
    .portal-shell * {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
    }

    .settings-portal,
    .settings-portal *,
    .settings-portal *::before,
    .settings-portal *::after {
      box-sizing: border-box;
    }

    .settings-portal input[type=color] {
      padding: 0;
      cursor: pointer;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .portal-content,
    .portal-content * {
      transition-property: background-color, border-color, color, box-shadow;
      transition-duration: 180ms;
      transition-timing-function: ease;
    }

    .portal-content h1,
    .portal-content h2,
    .portal-content h3,
    .portal-content h4 {
      letter-spacing: -0.02em;
    }

    .portal-content table {
      border-collapse: separate;
      border-spacing: 0;
    }

    .portal-content table th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${C.t3};
      font-weight: 700;
      background: ${C.bgElevated};
    }

    .portal-content table tr:hover td {
      background: rgba(255,255,255,0.72);
    }

    .portal-content input,
    .portal-content select,
    .portal-content textarea {
      background: ${C.inp} !important;
      border: 1px solid ${C.border} !important;
      color: ${C.t1} !important;
      border-radius: 10px !important;
      box-shadow: none !important;
    }

    .portal-content input::placeholder,
    .portal-content textarea::placeholder {
      color: ${C.t3} !important;
    }

    .portal-content input:focus,
    .portal-content select:focus,
    .portal-content textarea:focus {
      outline: none !important;
      border-color: ${C.purple} !important;
      box-shadow: 0 0 0 3px ${C.purpleDim} !important;
    }

    .portal-content a {
      color: inherit;
    }

    @media (max-width: 900px) {
      .portal-shell {
        min-width: 100%;
      }
    }
  `;

  return <style>{styles}</style>;
}
