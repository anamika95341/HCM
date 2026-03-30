import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../shared/components/Sidebar.jsx";
import Header from "../shared/components/Header.jsx";
import { usePortalTheme } from "../shared/theme/portalTheme.jsx";

function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const { C } = usePortalTheme();

  return (
    <div
      className="portal-shell"
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        overflow: "hidden",
        background: C.bg,
        position: "relative",
      }}
    >
      <aside
        style={{
          width: collapsed ? 84 : 280,
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
