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
            className="portal-shell w-full h-screen flex"
            style={{
                background: C.bg,
                position: "relative",
                overflow: "hidden",
            }}
        >
            <div
                aria-hidden="true"
                style={{
                    position: "fixed",
                    inset: 0,
                    pointerEvents: "none",
                    background: `
                      radial-gradient(circle at 0% 0%, rgba(124,58,237,0.07) 0, transparent 26%),
                      radial-gradient(circle at 100% 0%, rgba(5,150,105,0.05) 0, transparent 22%),
                      linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 22%)
                    `,
                    zIndex: 0,
                }}
            />
            <aside
                className={`transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
                style={{
                    borderRight: `1px solid ${C.border}`,
                    background: C.bgElevated,
                    position: "relative",
                    zIndex: 2,
                    height: "100%",
                    overflow: "hidden",
                    flexShrink: 0,
                }}
            >
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            </aside>

            <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: "transparent", position: "relative", zIndex: 1 }}>
                <Header />

                <main className="portal-content flex-1 overflow-auto min-h-0" style={{ background: "transparent" }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
