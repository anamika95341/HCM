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

const ROLE_LABELS = {
    citizen: "Citizen",
    admin: "Admin",
    masteradmin: "Master Admin",
    deo: "DEO",
    minister: "Minister",
};

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
        masteradmin: [
            { to: PATHS.masteradmin.dashboard, icon: FiHome, label: "Dashboard" },
            { to: PATHS.masteradmin.createAdmin, icon: RiTeamLine, label: "Create Admin" },
            { to: PATHS.masteradmin.createDeo, icon: RiTeamLine, label: "Create DEO" },
            { to: PATHS.masteradmin.manageAdmins, icon: FiClipboard, label: "Manage Admins" },
            { to: PATHS.masteradmin.manageDeos, icon: FiClipboard, label: "Manage DEOs" },
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

    const userName = session?.user?.firstName || session?.user?.username || "User";
    const userInitial = userName.charAt(0).toUpperCase();
    const roleLabel = ROLE_LABELS[role] || role;

    return (
        <div className="h-full flex flex-col" style={{ background: `linear-gradient(180deg, ${C.bgElevated} 0%, ${C.bg} 100%)` }}>
            <div
                className="flex items-center px-4"
                style={{
                    height: 62,
                    borderBottom: `1px solid ${C.border}`,
                    gap: 10,
                    justifyContent: collapsed ? "center" : "space-between",
                }}
            >
                {!collapsed && (
                    <Link
                        to={PATHS.login}
                        style={{
                            textDecoration: "none",
                            display: "flex",
                            flexDirection: "column",
                            lineHeight: 1.2,
                        }}
                    >
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.purple, letterSpacing: "-0.02em" }}>
                            Citizen Portal
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: C.t3, letterSpacing: "0.05em" }}>
                            GOVT. WORKSPACE
                        </span>
                    </Link>
                )}
                <SidebarItem type="" collapsed={collapsed} label="Toggle Navigation">
                    <button
                        onClick={onToggle}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            background: C.bg,
                            color: C.t2,
                            border: `1px solid ${C.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                        }}
                    >
                        <FiMenu size={15} />
                    </button>
                </SidebarItem>
            </div>

            {!collapsed && (
                <div style={{ padding: "10px 12px 0" }}>
                    <div
                        style={{
                            borderRadius: 12,
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            padding: "12px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 999,
                                background: C.purpleDim,
                                color: C.purple,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: 14,
                                border: `2px solid ${C.purple}30`,
                                flexShrink: 0,
                            }}
                        >
                            {userInitial}
                        </div>
                        <div style={{ overflow: "hidden", flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {userName}
                            </div>
                            <div style={{ marginTop: 4 }}>
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        background: C.purpleDim,
                                        color: C.purple,
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    {roleLabel.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-3 py-3 overflow-y-auto hide-scroll" style={{ flex: 1, marginTop: collapsed ? 0 : 8 }}>
                {!collapsed && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.12em", padding: "6px 4px 6px" }}>
                        Navigation
                    </div>
                )}
                <ul className="w-full space-y-0.5">
                    {navByRole[role].map((item) => (
                        <SidebarItem key={item.to} type="NavLink" to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} />
                    ))}
                </ul>
            </div>

            <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${C.border}` }}>
                <SidebarItem type="" collapsed={collapsed} label="Logout">
                    <button
                        onClick={handleLogout}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: collapsed ? "9px" : "9px 12px",
                            justifyContent: collapsed ? "center" : "flex-start",
                            cursor: "pointer",
                            color: C.danger,
                            background: `${C.danger}08`,
                            borderRadius: 10,
                            border: `1px solid ${C.danger}25`,
                            fontSize: 13,
                            fontWeight: 600,
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
    );
}

export default Sidebar;
