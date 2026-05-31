import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../shared/components/Sidebar.jsx";
import Header from "../shared/components/Header.jsx";
import { useAuth, useSessionExpired } from "../shared/auth/AuthContext.jsx";
import { usePortalTheme } from "../shared/theme/portalTheme.jsx";

function SessionExpiredBanner() {
  const [visible, setVisible] = useState(false);
  const { C } = usePortalTheme();

  useSessionExpired(() => {
    setVisible(true);
    setTimeout(() => setVisible(false), 5000);
  });

  if (!visible) return null;
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#7c3aed",
        color: "#fff",
        padding: "12px 24px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "fadeInDown 0.3s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 18 }}>⚠️</span>
      Your session has expired. Please log in again.
      <button
        onClick={() => setVisible(false)}
        style={{
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "0 0 0 8px",
          opacity: 0.7,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const sidebarWidth = collapsed ? 84 : 200;
  const modalOffsetLeft = collapsed ? 0 : sidebarWidth;

  return (
    <div
      className="portal-shell"
      data-portal-role={session?.role || "guest"}
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        background: C.bg,
        position: "relative",
        "--portal-sidebar-width": `${sidebarWidth}px`,
        "--portal-modal-offset-left": `${modalOffsetLeft}px`,
      }}
    >
      <SessionExpiredBanner />

      <aside
        style={{
          width: sidebarWidth,
          borderRight: `1px solid ${C.border}`,
          background: C.bgElevated,
          position: "relative",
          zIndex: 2,
          height: "100%",
          overflow: "hidden",
          flexShrink: 0,
          transition: "width var(--portal-duration-slow) var(--portal-ease-standard)",
        }}
      >
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
          background: "transparent",
        }}
      >
        <Header />

        <main
          className="portal-content"
          style={{
            flex: 1,
            overflow: "auto",
            minHeight: 0,
            background: "transparent",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
