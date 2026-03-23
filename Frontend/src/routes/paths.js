export const PATHS = {
  login: "/",
  adminLogin: "/admin",
  adminRegister: "/admin/register",
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
    legacyCases: "/admincases",
    caseDetail: "/admin/cases/:id",
    legacyCaseDetail: "/admincasedetail",
    meetings: "/admin/meetings",
    meetingDetail: "/admin/meetings/:meetingId",
    legacyMeetings: "/meetings",
  },
  minister: {
    home: "/Minister/dashboard",
    dashboard: "/Minister/dashboard",
    calendar: "/Minister/calendar",
    legacyDashboard: "/ministerdashboard",
  },
  deo: {
    home: "/DEO/calendar-events",
    calendarEvents: "/DEO/calendar-events",
    legacyCalendarEvents: "/CalendarEvent",
  },
};

export function getLoginPathForRole(role) {
  if (role === "admin") return PATHS.adminLogin;
  if (role === "minister") return PATHS.ministerLogin;
  if (role === "deo") return PATHS.deoLogin;
  return PATHS.login;
}

export function getHomePathForRole(role) {
  if (role === "admin") return PATHS.admin.workQueue;
  if (role === "minister") return PATHS.minister.dashboard;
  if (role === "deo") return PATHS.deo.calendarEvents;
  return PATHS.citizen.newCase;
}
