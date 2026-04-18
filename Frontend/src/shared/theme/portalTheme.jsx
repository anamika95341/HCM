import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&display=swap";
const THEME_STORAGE_KEY = "portal-theme";

export const LIGHT_THEME = {
  name: "light",
  bg: "#F5F5F5",
  bgElevated: "#FFFFFF",
  card: "#FFFFFF",
  cardHover: "#FAFAFA",
  inp: "#FAFAFA",
  border: "#E5E5E5",
  borderLight: "#EBEBEB",
  purple: "#7C3AED",
  purpleDim: "rgba(124, 58, 237, 0.12)",
  mint: "#059669",
  mintDim: "rgba(5, 150, 105, 0.12)",
  t1: "#171717",
  t2: "#525252",
  t3: "#737373",
  danger: "#DC2626",
  warn: "#D97706",
  success: "#059669",
  scrollbar: "#D4D4D4",
  scrollbarHover: "#A3A3A3",
  navHover: "rgba(0, 0, 0, 0.04)",
  insetShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
  activePillShadow: "0 1px 4px rgba(0,0,0,0.1)",
  activeGlow: "0 2px 8px rgba(124,58,237,0.3)",
  knobShadow: "0 1px 2px rgba(0,0,0,0.1)",
  statusGlow: "0 0 6px #059669",
  dialogShadow: "0 8px 32px rgba(0,0,0,0.12)",
  dropdownShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

export const DARK_THEME = {
  name: "dark",
  bg: "#0A0A0A",
  bgElevated: "#111111",
  card: "#161616",
  cardHover: "#1A1A1A",
  inp: "#1A1A1A",
  border: "#262626",
  borderLight: "#1F1F1F",
  purple: "#A855F7",
  purpleDim: "rgba(168, 85, 247, 0.15)",
  mint: "#34D399",
  mintDim: "rgba(52, 211, 153, 0.15)",
  t1: "#FFFFFF",
  t2: "#A3A3A3",
  t3: "#737373",
  danger: "#EF4444",
  warn: "#F59E0B",
  success: "#34D399",
  scrollbar: "#2E2E2E",
  scrollbarHover: "#404040",
  navHover: "rgba(255, 255, 255, 0.04)",
  insetShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
  activePillShadow: "0 2px 8px rgba(0,0,0,0.3)",
  activeGlow: "0 2px 8px rgba(168,85,247,0.4)",
  knobShadow: "0 1px 3px rgba(0,0,0,0.2)",
  statusGlow: "0 0 8px #34D399",
  dialogShadow: "0 8px 32px rgba(0,0,0,0.25)",
  dropdownShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

/** Mock swatches for settings theme preview cards (from LIGHT_THEME / DARK_THEME). */
export const PORTAL_THEME_PREVIEW_LIGHT = {
  appBg: LIGHT_THEME.bg,
  sidebar: LIGHT_THEME.bgElevated,
  panel: LIGHT_THEME.card,
  accent: LIGHT_THEME.purple,
  line: LIGHT_THEME.border,
  text: LIGHT_THEME.t1,
  muted: LIGHT_THEME.t3,
};

export const PORTAL_THEME_PREVIEW_DARK = {
  appBg: DARK_THEME.bg,
  sidebar: DARK_THEME.bgElevated,
  panel: DARK_THEME.card,
  accent: DARK_THEME.purple,
  line: DARK_THEME.border,
  text: DARK_THEME.t1,
  muted: DARK_THEME.t2,
};

const THEMES = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
};

const PortalThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  C: LIGHT_THEME,
});

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

export function PortalThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.portalTheme = theme;
    root.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
      C: THEMES[theme] || LIGHT_THEME,
    }),
    [theme],
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function PortalGlobalStyles() {
  const L = LIGHT_THEME;
  const D = DARK_THEME;

  const styles = `
    @import url('${FONT_URL}');

    :root {
      --portal-space-0: 0px;
      --portal-space-1: 2px;
      --portal-space-2: 4px;
      --portal-space-3: 6px;
      --portal-space-4: 8px;
      --portal-space-5: 10px;
      --portal-space-6: 12px;
      --portal-space-7: 14px;
      --portal-space-8: 16px;
      --portal-space-9: 18px;
      --portal-space-10: 20px;
      --portal-space-11: 24px;
      --portal-space-12: 28px;
      --portal-space-13: 32px;
      --portal-space-14: 40px;
      --portal-radius-sm: 10px;
      --portal-radius-md: 12px;
      --portal-radius-lg: 16px;
      --portal-radius-full: 999px;
      --portal-duration-fast: 0.2s;
      --portal-duration-med: 0.2s;
      --portal-duration-slow: 0.3s;
      --portal-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
      --portal-sidebar-width: 280px;
      --portal-content-max: 900px;
      --portal-header-height: 73px;
      --portal-text-on-primary: #ffffff;
      --portal-citizen-font: 'Lora', Georgia, 'Times New Roman', serif;
      --portal-citizen-label-size: 12px;
      --portal-citizen-value-size: 14px;
      --portal-citizen-caption-size: 12px;

      --portal-bg: ${L.bg};
      --portal-bg-elevated: ${L.bgElevated};
      --portal-card: ${L.card};
      --portal-card-hover: ${L.cardHover};
      --portal-input: ${L.inp};
      --portal-border: ${L.border};
      --portal-border-light: ${L.borderLight};
      --portal-purple: ${L.purple};
      --portal-purple-dim: ${L.purpleDim};
      --portal-mint: ${L.mint};
      --portal-mint-dim: ${L.mintDim};
      --portal-text-strong: ${L.t1};
      --portal-text: ${L.t2};
      --portal-text-muted: ${L.t3};
      --portal-danger: ${L.danger};
      --portal-warn: ${L.warn};
      --portal-success: ${L.success};
      --portal-scrollbar: ${L.scrollbar};
      --portal-scrollbar-hover: ${L.scrollbarHover};
      --portal-nav-hover: ${L.navHover};
      --portal-inset-shadow: ${L.insetShadow};
      --portal-active-pill-shadow: ${L.activePillShadow};
      --portal-active-glow: ${L.activeGlow};
      --portal-knob-shadow: ${L.knobShadow};
      --portal-status-glow: ${L.statusGlow};
      --portal-dialog-shadow: ${L.dialogShadow};
      --portal-dropdown-shadow: ${L.dropdownShadow};
    }

    :root[data-portal-theme='dark'] {
      --portal-bg: ${D.bg};
      --portal-bg-elevated: ${D.bgElevated};
      --portal-card: ${D.card};
      --portal-card-hover: ${D.cardHover};
      --portal-input: ${D.inp};
      --portal-border: ${D.border};
      --portal-border-light: ${D.borderLight};
      --portal-purple: ${D.purple};
      --portal-purple-dim: ${D.purpleDim};
      --portal-mint: ${D.mint};
      --portal-mint-dim: ${D.mintDim};
      --portal-text-strong: ${D.t1};
      --portal-text: ${D.t2};
      --portal-text-muted: ${D.t3};
      --portal-danger: ${D.danger};
      --portal-warn: ${D.warn};
      --portal-success: ${D.success};
      --portal-scrollbar: ${D.scrollbar};
      --portal-scrollbar-hover: ${D.scrollbarHover};
      --portal-nav-hover: ${D.navHover};
      --portal-inset-shadow: ${D.insetShadow};
      --portal-active-pill-shadow: ${D.activePillShadow};
      --portal-active-glow: ${D.activeGlow};
      --portal-knob-shadow: ${D.knobShadow};
      --portal-status-glow: ${D.statusGlow};
      --portal-dialog-shadow: ${D.dialogShadow};
      --portal-dropdown-shadow: ${D.dropdownShadow};
    }

    html, body, #root {
      min-height: 100%;
      background: var(--portal-bg);
    }

    html {
      font-size: 16px;
      scroll-behavior: smooth;
      transition: background-color var(--portal-duration-slow) ease;
    }

    body {
      margin: 0;
      background: var(--portal-bg);
      color: var(--portal-text-strong);
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      transition: background-color var(--portal-duration-slow) ease, color var(--portal-duration-slow) ease;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    button, input, select, textarea {
      font-family: inherit;
    }

    img, svg {
      display: block;
      max-width: 100%;
    }

    a {
      color: var(--portal-purple);
      font-weight: 600;
      text-decoration: none;
    }

    a:hover {
      opacity: 0.9;
    }

    ::selection {
      background: var(--portal-purple-dim);
      color: var(--portal-text-strong);
    }

    * {
      scrollbar-width: thin;
      scrollbar-color: var(--portal-scrollbar) transparent;
    }

    *::-webkit-scrollbar { width: 6px; height: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb {
      background: var(--portal-scrollbar);
      border-radius: var(--portal-radius-full);
    }
    *::-webkit-scrollbar-thumb:hover {
      background: var(--portal-scrollbar-hover);
    }

    .portal-shell {
      min-height: 100vh;
      color: var(--portal-text-strong);
      background: var(--portal-bg);
    }

    .portal-content,
    .portal-content * {
      transition-property: background-color, border-color, color, box-shadow, transform, opacity;
      transition-duration: var(--portal-duration-fast);
      transition-timing-function: ease;
    }

    .portal-content h1,
    .portal-content h2,
    .portal-content h3,
    .portal-content h4,
    .portal-content h5,
    .portal-content h6 {
      margin: 0;
      color: var(--portal-text-strong);
      letter-spacing: -0.02em;
    }

    .portal-shell[data-portal-role='citizen'],
    .portal-shell[data-portal-role='citizen'] button,
    .portal-shell[data-portal-role='citizen'] input,
    .portal-shell[data-portal-role='citizen'] select,
    .portal-shell[data-portal-role='citizen'] textarea,
    .portal-shell[data-portal-role='citizen'] .portal-content,
    .portal-shell[data-portal-role='citizen'] .portal-content button,
    .portal-shell[data-portal-role='citizen'] .portal-content input,
    .portal-shell[data-portal-role='citizen'] .portal-content select,
    .portal-shell[data-portal-role='citizen'] .portal-content textarea,
    .portal-shell[data-portal-role='citizen'] .portal-content h1,
    .portal-shell[data-portal-role='citizen'] .portal-content h2,
    .portal-shell[data-portal-role='citizen'] .portal-content h3,
    .portal-shell[data-portal-role='citizen'] .portal-content h4,
    .portal-shell[data-portal-role='citizen'] .portal-content h5,
    .portal-shell[data-portal-role='citizen'] .portal-content h6 {
      font-family: var(--portal-citizen-font);
    }

    .portal-content p {
      margin: 0;
      color: var(--portal-text);
    }

    .portal-content table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .portal-content table th {
      padding: var(--portal-space-6) var(--portal-space-8);
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--portal-text-muted);
      background: var(--portal-bg-elevated);
      white-space: nowrap;
    }

    .portal-content table td {
      padding: 14px var(--portal-space-8);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
      color: var(--portal-text-strong);
      border-bottom: 1px solid var(--portal-border-light);
      vertical-align: top;
    }

    .portal-content table tbody tr {
      transition: background var(--portal-duration-fast) ease;
    }

    .portal-content table tbody tr:hover td {
      background: color-mix(in srgb, var(--portal-card-hover) 86%, transparent);
    }

    .portal-field-label {
      display: block;
      margin-bottom: var(--portal-space-3);
      color: var(--portal-text);
      font-size: 12px;
      font-weight: 500;
      line-height: 1.45;
    }

    .portal-control,
    .portal-content input,
    .portal-content select,
    .portal-content textarea {
      width: 100%;
      min-height: 40px;
      padding: var(--portal-space-5) 14px;
      border: 1px solid var(--portal-border);
      border-radius: var(--portal-radius-sm);
      background: var(--portal-input);
      color: var(--portal-text-strong);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.5;
      outline: none;
      box-shadow: none;
      transition: border-color var(--portal-duration-fast) ease, box-shadow var(--portal-duration-fast) ease;
    }

    .portal-content input::placeholder,
    .portal-content textarea::placeholder {
      color: var(--portal-text-muted);
    }

    .portal-control:focus,
    .portal-control:focus-visible,
    .portal-content input:focus,
    .portal-content input:focus-visible,
    .portal-content select:focus,
    .portal-content select:focus-visible,
    .portal-content textarea:focus,
    .portal-content textarea:focus-visible {
      border-color: var(--portal-purple);
      box-shadow: 0 0 0 3px var(--portal-purple-dim);
    }

    .portal-control[readonly],
    .portal-content input[readonly],
    .portal-content textarea[readonly] {
      background: var(--portal-bg-elevated);
    }

    .portal-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--portal-space-4);
      min-height: 40px;
      padding: var(--portal-space-5) var(--portal-space-9);
      border-radius: var(--portal-radius-sm);
      border: 1px solid transparent;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.5;
      cursor: pointer;
      outline: none;
      transition: opacity var(--portal-duration-fast) ease, transform var(--portal-duration-fast) ease, background-color var(--portal-duration-fast) ease, border-color var(--portal-duration-fast) ease, color var(--portal-duration-fast) ease;
    }

    .portal-btn:hover {
      opacity: 0.9;
    }

    .portal-btn:active {
      transform: scale(0.98);
    }

    .portal-btn:focus-visible {
      outline: 2px solid var(--portal-purple);
      outline-offset: 2px;
    }

    .portal-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    .portal-btn-primary {
      background: var(--portal-purple);
      color: var(--portal-text-on-primary);
    }

    .portal-btn-outline {
      background: transparent;
      border-color: var(--portal-purple);
      color: var(--portal-purple);
    }

    .portal-btn-ghost {
      background: var(--portal-bg-elevated);
      border-color: var(--portal-border);
      color: var(--portal-text);
    }

    .portal-btn-danger {
      background: transparent;
      border-color: var(--portal-danger);
      color: var(--portal-danger);
    }

    .portal-btn-sm {
      min-height: 30px;
      padding: var(--portal-space-3) var(--portal-space-6);
      font-size: 12px;
    }

    .portal-card {
      background: var(--portal-card);
      border: 1px solid var(--portal-border);
      border-radius: var(--portal-radius-md);
      box-shadow: none;
    }

    .portal-surface {
      background: var(--portal-bg-elevated);
      border: 1px solid var(--portal-border);
      border-radius: var(--portal-radius-md);
    }

    .portal-pill-track {
      display: inline-flex;
      gap: var(--portal-space-1);
      padding: var(--portal-space-2);
      background: var(--portal-bg-elevated);
      border-radius: var(--portal-radius-full);
      box-shadow: var(--portal-inset-shadow);
    }

    .portal-pill-segment {
      display: inline-flex;
      align-items: center;
      gap: var(--portal-space-4);
      padding: var(--portal-space-3) var(--portal-space-5);
      border: none;
      border-radius: var(--portal-radius-full);
      background: transparent;
      color: var(--portal-text-muted);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--portal-duration-slow) var(--portal-ease-standard);
    }

    .portal-pill-segment.is-active {
      background: var(--portal-card);
      color: var(--portal-text-strong);
      box-shadow: var(--portal-active-pill-shadow);
    }

    .portal-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--portal-space-3);
      padding: 3px var(--portal-space-5);
      border-radius: var(--portal-radius-full);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .portal-status-dot {
      width: 8px;
      height: 8px;
      border-radius: var(--portal-radius-full);
      background: currentColor;
      box-shadow: var(--portal-status-glow);
    }

    .portal-callout {
      display: flex;
      align-items: flex-start;
      gap: var(--portal-space-5);
      padding: 14px var(--portal-space-8);
      border-radius: var(--portal-radius-sm);
      border: 1px solid var(--portal-border);
      background: var(--portal-bg-elevated);
      font-size: 12px;
      line-height: 1.55;
      color: var(--portal-text);
    }

    .portal-fade-slide {
      animation: portalFadeSlide var(--portal-duration-slow) var(--portal-ease-standard);
    }

    .portal-floating {
      box-shadow: var(--portal-dropdown-shadow);
    }

    @keyframes portalFadeSlide {
      from {
        opacity: 0;
        transform: translateY(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      html {
        scroll-behavior: auto;
      }

      .portal-content,
      .portal-content *,
      .portal-btn,
      .portal-pill-segment,
      .portal-fade-slide {
        animation: none !important;
        transition-duration: 0.01s !important;
      }

      .portal-btn:active {
        transform: none;
      }
    }

    .portal-citizen-page {
      min-height: 100%;
      overflow-x: hidden;
      overflow-y: visible;
    }

    .portal-citizen-label {
      font-size: var(--portal-citizen-label-size);
      font-weight: 700;
      line-height: 1.45;
      letter-spacing: 0.08em;
    }

    .portal-citizen-value {
      font-size: var(--portal-citizen-value-size);
      font-weight: 500;
      line-height: 1.6;
    }

    .portal-citizen-caption {
      font-size: var(--portal-citizen-caption-size);
      line-height: 1.5;
    }

    .portal-citizen-table-footer {
      padding-bottom: 8px;
    }

    .portal-citizen-pager {
      min-width: 0;
      row-gap: var(--portal-space-3);
    }

    .portal-citizen-pager-btn {
      width: auto;
      min-width: 104px;
      max-width: 100%;
      white-space: nowrap;
      flex: 0 1 auto;
    }
  `;

  return <style>{styles}</style>;
}
