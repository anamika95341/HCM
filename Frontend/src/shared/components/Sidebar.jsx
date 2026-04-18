import { FiCalendar, FiClipboard, FiHome, FiLogOut } from "react-icons/fi";
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
  const useCitizenNavUi = role === "citizen";

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
  };

    const navByRole = {
        citizen: [
            { to: PATHS.citizen.newCase, icon: FiHome, label: "Services" },
            { to: PATHS.citizen.meetings, icon: RiTeamLine, label: "My Meetings" },
            { to: PATHS.citizen.cases, icon: LuBox, label: "My Complaints" },
        ],
        admin: [
            { to: PATHS.admin.dashboard, icon: FiHome, label: "Dashboard" },
            { to: PATHS.admin.workQueue, icon: FiClipboard, label: "Work Queue" },
            { to: PATHS.admin.meetings, icon: RiTeamLine, label: "Meeting Queue" },
            { to: PATHS.admin.complaintQueue, icon: FiClipboard, label: "Complaint Queue" },
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
            { to: PATHS.deo.createEvent, icon: FiCalendar, label: "Create Event" },
            { to: PATHS.deo.manageEvent, icon: FiClipboard, label: "Manage Event" },
            { to: PATHS.deo.citizenMeetingFiles, icon: LuBox, label: "Citizen Meeting Files" },
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
          justifyContent: "flex-end",
          height: 55,
          padding: "var(--portal-space-10) var(--portal-space-8)",
          borderBottom: `1px solid ${C.border}`,
          gap: 10,
          fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
        }}
      >
        <SidebarItem type="" collapsed={collapsed} label="Toggle Navigation" isCitizen={useCitizenNavUi}>
          <button
            onClick={onToggle}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: useCitizenNavUi ? "transparent" : C.bgElevated,
              color: C.t2,
              border: useCitizenNavUi ? "none" : `1px solid ${C.border}`,
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

      <div style={{ padding: collapsed ? "12px 8px" : "12px 8px 16px", overflowY: "auto",
         overflowX: "hidden", flex: 1 }}>
       
        <ul style={{ width: "100%", display: "grid", gap: 2, margin: 0, padding: 0, listStyle: "none" }}>
          {navByRole[role].map((item) => (
            <SidebarItem key={item.to} type="NavLink" to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} isCitizen={useCitizenNavUi} />
          ))}
        </ul>
      </div>

      {role !== "citizen" && (
        <div style={{ padding: "12px", borderTop: `1px solid ${C.border}` }}>
          <SidebarItem type="" collapsed={collapsed} label="Logout" isCitizen={useCitizenNavUi}>
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
                fontSize: useCitizenNavUi ? 14 : 13,
                fontWeight: 600,
                lineHeight: useCitizenNavUi ? 1.45 : 1.4,
                fontFamily: useCitizenNavUi ? "var(--portal-citizen-font)" : "inherit",
              }}
            >
              <FiLogOut size={18} />
              {!collapsed && <div className={useCitizenNavUi ? "portal-citizen-value" : undefined} style={{ whiteSpace: "nowrap", fontWeight: 600 }}>Logout</div>}
            </button>
          </SidebarItem>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
