import { FiCalendar, FiClipboard, FiHome, FiLogOut } from "react-icons/fi";
import { Link } from "react-router-dom";
import {
    FiMenu,
} from "react-icons/fi";
import { BsFillGearFill } from "react-icons/bs";
import { RiTeamLine } from "react-icons/ri";
import SidebarItem from "./SidebarItem";
import { LuBox } from "react-icons/lu";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { useAuth } from "../auth/AuthContext.jsx";

function Sidebar({ collapsed, onToggle }) {
    const { C } = usePortalTheme();
    const { session, logout } = useAuth();
    const role = session?.role || "citizen";

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
    };

    const navByRole = {
        citizen: [
            { to: PATHS.citizen.newCase, icon: FiHome, label: "Services" },
            { to: PATHS.citizen.meetings, icon: RiTeamLine, label: "My Meetings" },
            { to: PATHS.citizen.cases, icon: LuBox, label: "My Complaints" },
            { to: PATHS.settings, icon: BsFillGearFill, label: "Settings" },
        ],
        admin: [
            { to: PATHS.admin.workQueue, icon: FiClipboard, label: "Work Queue" },
            { to: PATHS.admin.meetings, icon: RiTeamLine, label: "Meeting Queue" },
            { to: PATHS.admin.calendar, icon: FiCalendar, label: "Calendar" },
            { to: PATHS.settings, icon: BsFillGearFill, label: "Settings" },
        ],
        deo: [
            { to: PATHS.deo.calendarEvents, icon: RiTeamLine, label: "Verification Queue" },
            { to: PATHS.settings, icon: BsFillGearFill, label: "Settings" },
        ],
        minister: [
            { to: PATHS.minister.dashboard, icon: FiHome, label: "Dashboard" },
            { to: PATHS.minister.calendar, icon: FiCalendar, label: "Calendar" },
            { to: PATHS.settings, icon: BsFillGearFill, label: "Settings" },
        ],
    };

    return (
        <>
            <div className="h-full flex flex-col" style={{ background: C.bgElevated }}>
                <div
                    className="flex items-center justify-between px-4 py-4"
                    style={{ borderBottom: `1px solid ${C.border}` }}
                >
                    {!collapsed && (
                        <span className="font-semibold" style={{ color: C.t1 }}>
                            <Link to={PATHS.login}>Citizen Portal</Link>
                        </span>
                    )}
                    <SidebarItem type="" collapsed={collapsed} label="Expand Navigation Menu">
                        <button
                            onClick={onToggle}
                            className="p-2 cursor-pointer"
                            style={{
                                borderRadius: 10,
                                background: C.card,
                                color: C.t2,
                                border: `1px solid ${C.border}`,
                            }}
                        >
                            <FiMenu className="text-[16px] min-w-4 h-4" />
                        </button>
                    </SidebarItem>
                </div>
                <div className="h-full px-3 py-4 overflow-y-auto hide-scroll">
                    {!collapsed && (
                        <div
                            className="mb-4 rounded-xl p-4"
                            style={{ background: C.card, border: `1px solid ${C.border}` }}
                        >
                            <div className="text-[11px] uppercase tracking-[0.18em] font-bold" style={{ color: C.t3 }}>
                                Government Workspace
                            </div>
                            <div className="mt-2 text-sm font-semibold" style={{ color: C.t1 }}>
                                {role.toUpperCase()} portal
                            </div>
                            <div className="mt-1 text-xs leading-5" style={{ color: C.t3 }}>
                                Navigation aligned to the shared workspace system.
                            </div>
                        </div>
                    )}
                    <ul className="w-full space-y-1">
                        {navByRole[role].map((item) => (
                            <SidebarItem key={item.to} type="NavLink" to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} />
                        ))}
                    </ul>
                </div>
                <div className="px-3 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
                    <SidebarItem type="" collapsed={collapsed} label="Logout">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full p-3 cursor-pointer"
                            style={{
                                color: C.danger,
                                background: "transparent",
                                borderRadius: 10,
                                border: `1px solid ${C.border}`,
                                justifyContent: collapsed ? "center" : "flex-start",
                            }}
                        >
                            <FiLogOut className="text-[16px] min-w-4 h-4" />
                            <div className={`whitespace-nowrap transition-all duration-300 text-sm leading-4 h-4 ${collapsed ? "w-0 opacity-0 hidden" : "max-w-fit opacity-100"} `}>
                                Logout
                            </div>
                        </button>
                    </SidebarItem>
                </div>
            </div>
        </>
    );
}

export default Sidebar;
