import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";

export const THEMES = {
  dark: {
    bg: "#0a0a0a",
    bgElevated: "#111111",
    card: "#161616",
    cardHover: "#1a1a1a",
    border: "#262626",
    borderLight: "#1f1f1f",
    purple: "#a855f7",
    purpleDim: "rgba(168,85,247,0.15)",
    mint: "#34d399",
    mintDim: "rgba(52,211,153,0.15)",
    t1: "#ffffff",
    t2: "#a3a3a3",
    t3: "#737373",
    inp: "#1a1a1a",
    danger: "#ef4444",
    warn: "#f59e0b",
    success: "#34d399",
    scrollbar: "#2e2e2e",
    scrollbarHover: "#404040",
    navHover: "rgba(255,255,255,0.04)",
  },
  light: {
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
  },
};

const PortalThemeContext = createContext({
  theme: "dark",
  rawTheme: "dark",
  setTheme: () => {},
  C: THEMES.dark,
});

export function usePortalTheme() {
  return useContext(PortalThemeContext);
}

function useResolvedTheme(rawTheme) {
  const [resolvedTheme, setResolvedTheme] = useState("dark");

  useLayoutEffect(() => {
    const resolve = () => {
      if (rawTheme === "system") {
        setResolvedTheme(
          typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark"
        );
      } else {
        setResolvedTheme(rawTheme);
      }
    };

    resolve();

    if (rawTheme === "system" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
      mediaQuery.addEventListener("change", resolve);
      return () => mediaQuery.removeEventListener("change", resolve);
    }
  }, [rawTheme]);

  return resolvedTheme;
}

export function PortalThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("eparinam-theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("eparinam-theme", theme);
    } catch {}
  }, [theme]);

  const resolvedTheme = useResolvedTheme(theme);
  const value = useMemo(
    () => ({
      theme: resolvedTheme,
      rawTheme: theme,
      setTheme,
      C: THEMES[resolvedTheme],
    }),
    [resolvedTheme, theme]
  );

  return <PortalThemeContext.Provider value={value}>{children}</PortalThemeContext.Provider>;
}

export function PortalGlobalStyles() {
  const { theme, C } = usePortalTheme();

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @import url('${FONT_URL}');
          :root {
            color-scheme: ${theme === "dark" ? "dark" : "light"};
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
            --portal-shadow: ${theme === "dark" ? "0 24px 80px rgba(0,0,0,0.35)" : "0 24px 80px rgba(15,23,42,0.08)"};
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
              radial-gradient(circle at top left, ${theme === "dark" ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.08)"} 0, transparent 28%),
              radial-gradient(circle at top right, ${theme === "dark" ? "rgba(52,211,153,0.08)" : "rgba(5,150,105,0.06)"} 0, transparent 22%),
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

          .portal-content button {
            border-radius: 10px;
            font-weight: 600;
          }

          .portal-content table {
            color: ${C.t1};
          }

          .portal-content thead tr,
          .portal-content thead {
            background: ${C.bgElevated} !important;
          }

          .portal-content tbody tr {
            background: transparent !important;
          }

          .portal-content tbody tr:hover {
            background: ${C.navHover} !important;
          }

          .portal-content [class*="bg-white"],
          .portal-content [class*="bg-slate-50"],
          .portal-content [class*="bg-gray-50"],
          .portal-content [class*="bg-blue-50"],
          .portal-content [class*="bg-indigo-50"] {
            background: ${C.card} !important;
          }

          .portal-content [class*="bg-slate-100"],
          .portal-content [class*="bg-gray-100"] {
            background: ${C.bgElevated} !important;
          }

          .portal-content [class*="text-gray-900"],
          .portal-content [class*="text-slate-900"],
          .portal-content [class*="text-gray-800"],
          .portal-content [class*="text-slate-800"] {
            color: ${C.t1} !important;
          }

          .portal-content [class*="text-gray-700"],
          .portal-content [class*="text-slate-700"],
          .portal-content [class*="text-gray-600"],
          .portal-content [class*="text-slate-600"],
          .portal-content [class*="text-gray-500"],
          .portal-content [class*="text-slate-500"] {
            color: ${C.t2} !important;
          }

          .portal-content [class*="text-gray-400"],
          .portal-content [class*="text-slate-400"] {
            color: ${C.t3} !important;
          }

          .portal-content [class*="text-sm"] {
            font-size: 13px !important;
          }

          .portal-content [class*="text-xs"] {
            font-size: 11px !important;
          }

          .portal-content [class*="border-gray-100"],
          .portal-content [class*="border-gray-200"],
          .portal-content [class*="border-gray-300"],
          .portal-content [class*="border-slate-200"],
          .portal-content [class*="border-slate-300"] {
            border-color: ${C.border} !important;
          }

          .portal-content [class*="shadow"],
          .portal-content .shadow,
          .portal-content .shadow-sm,
          .portal-content .shadow-lg,
          .portal-content .shadow-xl,
          .portal-content .shadow-2xl {
            box-shadow: ${theme === "dark" ? "0 10px 40px rgba(0,0,0,0.18)" : "0 10px 32px rgba(15,23,42,0.08)"} !important;
          }

          .portal-content [class*="rounded-2xl"],
          .portal-content [class*="rounded-xl"],
          .portal-content [class*="rounded-lg"] {
            border-radius: 12px !important;
          }

          .portal-content [class*="bg-gradient-to-r"],
          .portal-content [class*="bg-gradient-to-br"] {
            background-image: none !important;
          }

          .portal-content .portal-page {
            min-height: 100%;
            padding: 32px 40px;
          }

          .portal-content .portal-page-wrap {
            max-width: 1320px;
            margin: 0 auto;
          }

          .portal-content .portal-panel {
            background: ${C.card} !important;
            border: 1px solid ${C.border} !important;
            border-radius: 12px !important;
            box-shadow: ${theme === "dark" ? "0 10px 40px rgba(0,0,0,0.18)" : "0 10px 32px rgba(15,23,42,0.08)"} !important;
          }

          .portal-content .portal-hero {
            background: ${C.bgElevated} !important;
            border: 1px solid ${C.border} !important;
            border-radius: 16px !important;
            padding: 24px 28px !important;
            margin-bottom: 24px !important;
            box-shadow: ${theme === "dark" ? "0 10px 40px rgba(0,0,0,0.18)" : "0 10px 32px rgba(15,23,42,0.08)"} !important;
          }

          .portal-content .portal-hero h1 {
            margin: 0 0 6px;
            font-size: 28px !important;
            line-height: 1.1;
            font-weight: 700 !important;
            color: ${C.t1} !important;
          }

          .portal-content .portal-hero p,
          .portal-content .portal-hero .portal-hero-subtitle {
            margin: 0;
            font-size: 13px !important;
            color: ${C.t3} !important;
          }

          .portal-content > div[class*="min-h-screen"] {
            min-height: 100% !important;
            background: transparent !important;
          }

          .portal-content [class*="bg-blue-600"],
          .portal-content [class*="bg-indigo-600"] {
            background: ${C.purple} !important;
            color: #fff !important;
          }

          .portal-content [class*="bg-emerald-100"],
          .portal-content [class*="bg-green-100"] {
            background: ${C.mintDim} !important;
          }

          .portal-content [class*="text-emerald-700"],
          .portal-content [class*="text-green-700"],
          .portal-content [class*="text-emerald-600"],
          .portal-content [class*="text-green-600"] {
            color: ${C.mint} !important;
          }

          .portal-content [class*="bg-amber-100"],
          .portal-content [class*="bg-yellow-100"] {
            background: ${C.warn}20 !important;
          }

          .portal-content [class*="text-amber-700"],
          .portal-content [class*="text-yellow-700"],
          .portal-content [class*="text-amber-600"],
          .portal-content [class*="text-yellow-600"] {
            color: ${C.warn} !important;
          }

          .portal-content [class*="bg-rose-100"],
          .portal-content [class*="bg-red-100"] {
            background: ${C.danger}20 !important;
          }

          .portal-content [class*="text-rose-700"],
          .portal-content [class*="text-red-700"],
          .portal-content [class*="text-red-600"] {
            color: ${C.danger} !important;
          }

          .portal-content [class*="hover:bg-blue-700"],
          .portal-content [class*="hover:bg-indigo-700"] {
            background: ${C.purple} !important;
          }

          .portal-content [class*="text-blue-600"],
          .portal-content [class*="text-indigo-600"] {
            color: ${C.purple} !important;
          }

          .portal-content [class*="ring-blue-500"],
          .portal-content [class*="focus:ring-blue-500"],
          .portal-content [class*="focus:ring-indigo-500"] {
            --tw-ring-color: ${C.purple} !important;
          }

          .portal-content [class*="border-blue-200"],
          .portal-content [class*="border-indigo-200"] {
            border-color: ${C.border} !important;
          }

          .portal-content .portal-page-header {
            margin-bottom: 28px;
          }

          .portal-content .portal-page-header h1,
          .portal-content .portal-page-header h2 {
            margin: 0 0 6px;
            font-size: 28px;
            line-height: 1.1;
            font-weight: 700;
            color: ${C.t1};
          }

          .portal-content .portal-page-header p {
            margin: 0;
            color: ${C.t3};
            font-size: 13px;
          }

          @media (max-width: 1024px) {
            .portal-content .portal-page {
              padding: 24px 20px;
            }
          }
        `,
      }}
    />
  );
}
