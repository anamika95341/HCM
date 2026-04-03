export const PATHS = {
  login: "/",
  adminLogin: "/admin",
  adminVerify: "/admin/verify",
  masteradminLogin: "/masteradmin",
  ministerLogin: "/Minister",
  deoLogin: "/DEO",
  settings: "/settings",
  citizen: {
    home: "/citizen",
    newCase: "/citizen/new-case",
    legacyNewCase: "/newcase",
    cases: "/citizen/cases",
    legacyCases: "/citizencase",
    meetings: "/citizen/meetings",
    meetingDetail: "/citizen/meetings/:id",
    legacyMeetings: "/meeting",
    caseDetail: "/citizen/cases/:id",
    legacyCaseDetail: "/case/:id",
  },
  admin: {
    home: "/admin/work-queue",
    calendar: "/admin/calendar",
    legacyCalendar: "/calendar",
    workQueue: "/admin/work-queue",
    pool: "/admin/pool",
    legacyPool: "/adminallcases",
    cases: "/admin/cases",
    complaints: "/admin/complaints",
    legacyCases: "/admincases",
    caseDetail: "/admin/cases/:id",
    legacyCaseDetail: "/admincasedetail",
    meetings: "/admin/meetings",
    meetingDetail: "/admin/meetings/:meetingId",
    legacyMeetings: "/meetings",
  },
  masteradmin: {
    home: "/masteradmin/dashboard",
    dashboard: "/masteradmin/dashboard",
    createAdmin: "/masteradmin/create-admin",
    createDeo: "/masteradmin/create-deo",
    manageAdmins: "/masteradmin/manage-admins",
    manageDeos: "/masteradmin/manage-deos",
  },
  minister: {
    home: "/Minister/dashboard",
    dashboard: "/Minister/dashboard",
    calendar: "/Minister/calendar",
    legacyDashboard: "/ministerdashboard",
  },
  deo: {
    home: "/DEO/calendar-events",
    verify: "/DEO/verify",
    calendarEvents: "/DEO/calendar-events",
    legacyCalendarEvents: "/CalendarEvent",
    createEvent: "/DEO/create-event",
    manageEvent: "/DEO/manage-event",
    citizenMeetingFiles: "/DEO/citizen-meeting-files",
  },
};

export function getLoginPathForRole(role) {
  if (role === "masteradmin") return PATHS.masteradminLogin;
  if (role === "admin") return PATHS.adminLogin;
  if (role === "minister") return PATHS.ministerLogin;
  if (role === "deo") return PATHS.deoLogin;
  return PATHS.login;
}

export function getHomePathForRole(role) {
  if (role === "masteradmin") return PATHS.masteradmin.dashboard;
  if (role === "admin") return PATHS.admin.workQueue;
  if (role === "minister") return PATHS.minister.dashboard;
  if (role === "deo") return PATHS.deo.calendarEvents;
  return PATHS.citizen.newCase;
}
