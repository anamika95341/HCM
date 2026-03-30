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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: C.bgElevated }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 73,
          padding: collapsed ? "var(--portal-space-10) var(--portal-space-8)" : "var(--portal-space-11) var(--portal-space-10)",
          borderBottom: `1px solid ${C.border}`,
          gap: 10,
        }}
      >
        {!collapsed && (
          <Link
            to={PATHS.login}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: C.t1, lineHeight: 1.35 }}>
              E-Parinam
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.t3, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Unified Portal
            </span>
          </Link>
        )}
        <SidebarItem type="" collapsed={collapsed} label="Toggle Navigation">
          <button
            onClick={onToggle}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: C.bgElevated,
              color: C.t2,
              border: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <FiMenu size={16} />
          </button>
        </SidebarItem>
      </div>

      {!collapsed && (
        <div style={{ padding: "16px 12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div
            style={{
              padding: "0 0 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: C.purpleDim,
                color: C.purple,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {userInitial}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {userName}
              </div>
              <div style={{ marginTop: 4 }}>
                <span className="portal-badge" style={{ background: C.purpleDim, color: C.purple }}>
                  {roleLabel.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: collapsed ? "12px 8px" : "12px 8px 16px", overflowY: "auto", flex: 1 }}>
        {!collapsed && (
          <div style={{ padding: "6px 8px 10px", fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Navigation
          </div>
        )}
        <ul style={{ width: "100%", display: "grid", gap: 2, margin: 0, padding: 0, listStyle: "none" }}>
          {navByRole[role].map((item) => (
            <SidebarItem key={item.to} type="NavLink" to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} />
          ))}
        </ul>
      </div>

      <div style={{ padding: "12px", borderTop: `1px solid ${C.border}` }}>
        <SidebarItem type="" collapsed={collapsed} label="Logout">
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              minHeight: 40,
              padding: collapsed ? "var(--portal-space-6)" : "var(--portal-space-6) var(--portal-space-8)",
              justifyContent: collapsed ? "center" : "flex-start",
              cursor: "pointer",
              color: C.danger,
              background: "transparent",
              borderRadius: 10,
              border: `1px solid ${C.danger}`,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <FiLogOut size={18} />
            {!collapsed && <div style={{ whiteSpace: "nowrap" }}>Logout</div>}
          </button>
        </SidebarItem>
      </div>
    </div>
  );
}

export default Sidebar;
