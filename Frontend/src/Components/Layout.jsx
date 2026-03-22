import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { usePortalTheme } from "../theme/portalTheme";

function Layout() {
    const [collapsed, setCollapsed] = useState(false);
    const { C } = usePortalTheme();

    return (
        <div className="portal-shell w-full min-h-screen flex" style={{ background: "var(--portal-bg)" }}>
            <aside
                className={`transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}
                style={{ borderRight: `1px solid ${C.border}`, background: C.bgElevated }}
            >
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            </aside>

            <div className="flex flex-col flex-1 min-w-0" style={{ background: C.bg }}>
                <Header />

                <main className="portal-content flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;
