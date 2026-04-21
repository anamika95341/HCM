import { FiCalendar, FiCheckCircle, FiClipboard, FiFileText, FiHome } from "react-icons/fi";
import {
    FiMenu,
} from "react-icons/fi";
import { RiTeamLine } from "react-icons/ri";
import { RiAlarmWarningLine, RiCheckboxCircleLine } from "react-icons/ri";
import SidebarItem from "./SidebarItem";
import { LuBox } from "react-icons/lu";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { useAuth } from "../auth/AuthContext.jsx";

function Sidebar({ collapsed, onToggle }) {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const role = session?.role || "citizen";
  const useCitizenNavUi = role === "citizen" || role === "admin";

    const navByRole = {
        citizen: [
            { to: PATHS.citizen.newCase, icon: FiHome, label: "Services" },
            { to: PATHS.citizen.meetings, icon: RiTeamLine, label: "My Meetings" },
            { to: PATHS.citizen.cases, icon: LuBox, label: "My Complaints" },
        ],
        admin: [
            { to: PATHS.admin.dashboard, icon: FiHome, label: "Dashboard" },
            {
              to: PATHS.admin.workQueue,
              icon: FiClipboard,
              label: "Work Pool",
              activeMatch: (location) => {
                const currentTab = new URLSearchParams(location.search).get("tab");
                return !currentTab || currentTab === "complaint-pool" || currentTab === "meeting-pool";
              },
            },
            {
              to: PATHS.admin.meetings,
              icon: RiTeamLine,
              label: "My Meetings",
              activeMatch: (location) => {
                const source = new URLSearchParams(location.search).get("source");
                return source !== "completed-meetings";
              },
            },
            { to: PATHS.admin.complaintQueue, icon: FiFileText, label: "My Complaints" },
            {
              to: `${PATHS.admin.workQueue}?tab=escalated`,
              icon: RiAlarmWarningLine,
              label: "Escalated Cases",
              activeMatch: (location) => new URLSearchParams(location.search).get("tab") === "escalated",
            },
            {
              to: `${PATHS.admin.workQueue}?tab=resolved-complaints`,
              icon: FiCheckCircle,
              label: "Resolved Complaints",
              activeMatch: (location) => new URLSearchParams(location.search).get("tab") === "resolved-complaints",
            },
            {
              to: `${PATHS.admin.workQueue}?tab=completed-meetings`,
              icon: RiCheckboxCircleLine,
              label: "Completed Meetings",
              activeMatch: (location) => {
                const params = new URLSearchParams(location.search);
                return params.get("tab") === "completed-meetings" || params.get("source") === "completed-meetings";
              },
            },
            { to: PATHS.admin.calendar, icon: FiCalendar, label: "Calendar" },
        ],
        masteradmin: [
            { to: PATHS.masteradmin.dashboard, icon: FiHome, label: "Dashboard" },
            { to: PATHS.masteradmin.createAdmin, icon: RiTeamLine, label: "Create Admin" },
            { to: PATHS.masteradmin.createDeo, icon: RiTeamLine, label: "Create DEO" },
            { to: PATHS.masteradmin.manageAdmins, icon: FiClipboard, label: "Manage Admins" },
            { to: PATHS.masteradmin.manageDeos, icon: FiClipboard, label: "Manage DEOs" },
        ],
        deo: [
            { to: PATHS.deo.calendarEvents, icon: RiTeamLine, label: "Verification Queue" },
            { to: PATHS.deo.createEvent, icon: FiCalendar, label: "Create Event" },
            { to: PATHS.deo.manageEvent, icon: FiClipboard, label: "Manage Event" },
            { to: PATHS.deo.citizenMeetingFiles, icon: LuBox, label: "Citizen Meeting Files" },
        ],
        minister: [
            { to: PATHS.minister.dashboard, icon: FiHome, label: "Dashboard" },
            { to: PATHS.minister.calendar, icon: FiCalendar, label: "Calendar" },
        ],
    };

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
            <SidebarItem key={item.to} type="NavLink" to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} isCitizen={useCitizenNavUi} activeMatch={item.activeMatch} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Sidebar;
