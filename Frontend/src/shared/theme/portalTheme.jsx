import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_STORAGE_KEY = "portal-theme";

const EP_THEME_VALUES = {
  light: {
    bg: "#F5F6F8",
    surface: "#FFFFFF",
    surfaceHover: "#FAFBFC",
    surfaceActive: "#F0F2F5",
    elevated: "#FFFFFF",
    overlay: "rgba(15,17,23,.6)",
    border: "#E8EBF0",
    borderSubtle: "#F0F1F4",
    borderStrong: "#D4D8E0",
    text: "#111827",
    text2: "#4B5563",
    text3: "#9CA3AF",
    textInverse: "#FFFFFF",
    accent: "#1B3D6D",
    accentHover: "#2A5A9E",
    accentBg: "#EFF4FB",
    accentBright: "#7C3AED",
    accentBrightBg: "#F5F3FF",
    gold: "#B8860B",
    goldBg: "#FDF8ED",
    success: "#059669",
    successBg: "#ECFDF5",
    warning: "#D97706",
    warningBg: "#FFFBEB",
    danger: "#DC2626",
    dangerBg: "#FEF2F2",
    info: "#2563EB",
    infoBg: "#EFF6FF",
    shadowSm: "0 1px 2px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.06)",
    shadowMd: "0 4px 6px rgba(0,0,0,.04), 0 2px 4px rgba(0,0,0,.06)",
    shadowLg: "0 10px 25px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.04)",
    shadowXl: "0 20px 50px rgba(0,0,0,.08), 0 8px 20px rgba(0,0,0,.04)",
    shadowInset: "inset 0 1px 3px rgba(0,0,0,.08)",
    shadowFocus: "0 0 0 3px rgba(124,58,237,.25)",
    scrollbar: "#D4D8E0",
    scrollbarHover: "#AAB2C1",
    navHover: "rgba(17, 24, 39, 0.04)",
  },
  dark: {
    bg: "#0F1117",
    surface: "#1A1D27",
    surfaceHover: "#22252F",
    surfaceActive: "#2A2D38",
    elevated: "#1E2130",
    overlay: "rgba(0,0,0,.7)",
    border: "#2E3241",
    borderSubtle: "#252836",
    borderStrong: "#3B404F",
    text: "#E8EBF0",
    text2: "#A0A8B8",
    text3: "#6B7280",
    textInverse: "#111827",
    accent: "#4A7CC9",
    accentHover: "#6B9BE0",
    accentBg: "#1B2A45",
    accentBright: "#A78BFA",
    accentBrightBg: "#1E1535",
    gold: "#D4A843",
    goldBg: "#2A2415",
    success: "#34D399",
    successBg: "#0D2818",
    warning: "#FBBF24",
    warningBg: "#2A2415",
    danger: "#F87171",
    dangerBg: "#2D1515",
    info: "#60A5FA",
    infoBg: "#152040",
    shadowSm: "0 1px 2px rgba(0,0,0,.3), 0 1px 3px rgba(0,0,0,.2)",
    shadowMd: "0 4px 6px rgba(0,0,0,.3), 0 2px 4px rgba(0,0,0,.2)",
    shadowLg: "0 10px 25px rgba(0,0,0,.4), 0 4px 10px rgba(0,0,0,.3)",
    shadowXl: "0 20px 50px rgba(0,0,0,.5), 0 8px 20px rgba(0,0,0,.3)",
    shadowInset: "inset 0 2px 4px rgba(0,0,0,.3)",
    shadowFocus: "0 0 0 3px rgba(167,139,250,.35)",
    scrollbar: "#3B404F",
    scrollbarHover: "#525867",
    navHover: "rgba(232, 235, 240, 0.05)",
  },
};

function buildCompatTheme(themeName) {
  const v = EP_THEME_VALUES[themeName] || EP_THEME_VALUES.light;

  return {
    name: themeName,
    bg: v.bg,
    bgElevated: v.elevated,
    card: v.surface,
    cardHover: v.surfaceHover,
    inp: v.surface,
    border: v.border,
    borderLight: v.borderSubtle,
    purple: v.accentBright,
    purpleDim: v.accentBrightBg,
    mint: v.success,
    mintDim: v.successBg,
    t1: v.text,
    t2: v.text2,
    t3: v.text3,
    danger: v.danger,
    warn: v.warning,
    success: v.success,
    gold: v.gold,
    info: v.info,
    scrollbar: v.scrollbar,
    scrollbarHover: v.scrollbarHover,
    navHover: v.navHover,
    insetShadow: v.shadowInset,
    activePillShadow: v.shadowSm,
    activeGlow: v.shadowFocus,
    knobShadow: v.shadowSm,
    statusGlow: `0 0 6px ${v.success}`,
    dialogShadow: v.shadowLg,
    dropdownShadow: v.shadowMd,
    textOnPrimary: v.textInverse,
  };
}

export const LIGHT_THEME = buildCompatTheme("light");
export const DARK_THEME = buildCompatTheme("dark");

export const PORTAL_THEME_PREVIEW_LIGHT = {
  appBg: EP_THEME_VALUES.light.bg,
  sidebar: EP_THEME_VALUES.light.elevated,
  panel: EP_THEME_VALUES.light.surface,
  accent: EP_THEME_VALUES.light.accentBright,
  line: EP_THEME_VALUES.light.border,
  text: EP_THEME_VALUES.light.text,
  muted: EP_THEME_VALUES.light.text3,
};

export const PORTAL_THEME_PREVIEW_DARK = {
  appBg: EP_THEME_VALUES.dark.bg,
  sidebar: EP_THEME_VALUES.dark.elevated,
  panel: EP_THEME_VALUES.dark.surface,
  accent: EP_THEME_VALUES.dark.accentBright,
  line: EP_THEME_VALUES.dark.border,
  text: EP_THEME_VALUES.dark.text,
  muted: EP_THEME_VALUES.dark.text2,
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
  if (stored === "light" || stored === "dark") return stored;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function token(name) {
  if (typeof window === "undefined" || typeof document === "undefined") return "";

  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--ep-${name}`)
    .trim();
}

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

export function PortalThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    return initialTheme;
  });

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
      C: buildCompatTheme(theme),
    }),
    [theme],
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function PortalGlobalStyles() {
  return null;
}
