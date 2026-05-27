import { FiCalendar, FiCheckCircle, FiClipboard, FiFileText, FiHome } from "react-icons/fi";
import {
    FiMenu,
} from "react-icons/fi";
import { RiTeamLine } from "react-icons/ri";
import { RiCheckboxCircleLine } from "react-icons/ri";
import SidebarItem from "./SidebarItem";
import { LuBox } from "react-icons/lu";
import { usePortalTheme } from "../theme/portalTheme.jsx";
import { PATHS } from "../../routes/paths.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTranslation } from "react-i18next";

function Sidebar({ collapsed, onToggle }) {
  const { C } = usePortalTheme();
  const { session } = useAuth();
  const { t } = useTranslation();
  const role = session?.role || "citizen";
  const adminType = session?.user?.adminType || "regular";
  const isChiefMinister = role === "admin" && adminType === "chief_minister";
  const useCitizenNavUi = role === "citizen" || role === "admin";

  const regularAdminNav = [
    { to: PATHS.admin.dashboard, icon: FiHome, label: t("sidebar.dashboard") },
    {
      to: PATHS.admin.workQueue,
      icon: FiClipboard,
      label: t("sidebar.appointmentPool"),
      activeMatch: (location, isActive) => {
        const currentTab = new URLSearchParams(location.search).get("tab");
        return isActive && (!currentTab || currentTab === "appointment-pool");
      },
    },
    {
      to: PATHS.admin.appointments,
      icon: RiTeamLine,
      label: t("sidebar.myAppointments"),
      activeMatch: (location, isActive) => {
        return isActive && location.pathname === PATHS.admin.appointments;
      },
    },
    {
      to: `${PATHS.admin.workQueue}?tab=completed-appointments`,
      icon: RiCheckboxCircleLine,
      label: t("sidebar.completedAppointments"),
      activeMatch: (location, isActive) => {
        const params = new URLSearchParams(location.search);
        return isActive && params.get("tab") === "completed-appointments";
      },
    },
    { to: PATHS.admin.calendar, icon: FiCalendar, label: t("sidebar.calendar") },
  ];

  const chiefMinisterAdminNav = [
    { to: PATHS.admin.dashboard, icon: FiHome, label: t("sidebar.dashboard") },
    {
      to: PATHS.admin.workQueue,
      icon: FiClipboard,
      label: t("sidebar.appointmentPool"),
      activeMatch: (location, isActive) => {
        const currentTab = new URLSearchParams(location.search).get("tab");
        return isActive && (!currentTab || currentTab === "appointment-pool");
      },
    },
    {
      to: PATHS.admin.appointments,
      icon: RiTeamLine,
      label: t("sidebar.myAppointments"),
      activeMatch: (location, isActive) => {
        return isActive && location.pathname === PATHS.admin.appointments;
      },
    },
    { to: PATHS.admin.grievanceQueue, icon: FiFileText, label: t("sidebar.myGrievances") },
    {
      to: `${PATHS.admin.workQueue}?tab=resolved-grievances`,
      icon: FiCheckCircle,
      label: t("sidebar.resolvedGrievances"),
      activeMatch: (location, isActive) => isActive && new URLSearchParams(location.search).get("tab") === "resolved-grievances",
    },
    {
      to: `${PATHS.admin.workQueue}?tab=completed-appointments`,
      icon: RiCheckboxCircleLine,
      label: t("sidebar.completedAppointments"),
      activeMatch: (location, isActive) => {
        const params = new URLSearchParams(location.search);
        return isActive && params.get("tab") === "completed-appointments";
      },
    },
    { to: PATHS.admin.calendar, icon: FiCalendar, label: t("sidebar.calendar") },
  ];

    const navByRole = {
        citizen: [
            { to: PATHS.citizen.newCase, icon: FiHome, label: t("sidebar.services") },
            { to: PATHS.citizen.appointments, icon: RiTeamLine, label: t("sidebar.myAppointments") },
            { to: PATHS.citizen.cases, icon: LuBox, label: t("sidebar.myGrievances") },
        ],
        admin: isChiefMinister ? chiefMinisterAdminNav : regularAdminNav,
        masteradmin: [
            { to: PATHS.masteradmin.dashboard, icon: FiHome, label: t("sidebar.dashboard") },
            { to: PATHS.masteradmin.createAdmin, icon: RiTeamLine, label: t("sidebar.createAdmin") },
            { to: PATHS.masteradmin.createDeo, icon: RiTeamLine, label: t("sidebar.createDeo") },
            { to: PATHS.masteradmin.manageAdmins, icon: FiClipboard, label: t("sidebar.manageAdmins") },
            { to: PATHS.masteradmin.manageDeos, icon: FiClipboard, label: t("sidebar.manageDeos") },
        ],
        deo: [
            { to: PATHS.deo.calendarEvents, icon: RiTeamLine, label: t("sidebar.appointmentVerification") },
            { to: PATHS.deo.grievances, icon: FiFileText, label: t("sidebar.grievances") },
            { to: PATHS.deo.createEvent, icon: FiCalendar, label: t("sidebar.createEvent") },
            { to: PATHS.deo.manageEvent, icon: FiClipboard, label: t("sidebar.manageEvent") },
            { to: PATHS.deo.citizenAppointmentFiles, icon: LuBox, label: t("sidebar.citizenAppointmentFiles") },
        ],
        minister: [
            { to: PATHS.minister.dashboard, icon: FiHome, label: t("sidebar.dashboard") },
            { to: PATHS.minister.calendar, icon: FiCalendar, label: t("sidebar.calendar") },
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
        <SidebarItem type="" collapsed={collapsed} label={t("sidebar.toggleNav")} isCitizen={useCitizenNavUi}>
          <button
            onClick={onToggle}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "transparent",
              color: C.t2,
              border: "none",
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
