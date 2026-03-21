import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="w-full h-screen flex">
            
            {/* Sidebar */}
            <aside className={`transition-all ${collapsed ? "w-14" : "w-52"}`}>
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(!collapsed)}
                />
            </aside>

            {/* Main */}
            <div className="flex flex-col flex-1">
                <Header />

                <main className="flex-1 overflow-auto p-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Layout;