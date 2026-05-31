export const PATHS = {
  login: "/",
  adminLogin: "/admin",
  adminVerify: "/admin/verify",
  masteradminLogin: "/masteradmin",
  ministerLogin: "/Minister",
  deoLogin: "/DEO",
  operators: "/operators",
  settings: "/settings",
  citizen: {
    home: "/citizen",
    newCase: "/citizen/new-case",
    legacyNewCase: "/newcase",
    cases: "/citizen/cases",
    legacyCases: "/citizencase",
    appointments: "/citizen/appointments",
    appointmentDetail: "/citizen/appointments/:id",
    legacyAppointments: "/appointment",
    caseDetail: "/citizen/cases/:id",
    legacyCaseDetail: "/case/:id",
  },
  admin: {
    home: "/admin/dashboard",
    dashboard: "/admin/dashboard",
    calendar: "/admin/calendar",
    legacyCalendar: "/calendar",
    workQueue: "/admin/work-queue",
    workQueueAppointmentDetail: "/admin/work-item/appointments/:appointmentId",
    grievanceQueue: "/admin/grievance-queue",
    pool: "/admin/pool",
    legacyPool: "/adminallcases",
    cases: "/admin/cases",
    legacyCases: "/admincases",
    caseDetail: "/admin/cases/:id",
    legacyCaseDetail: "/admincasedetail",
    appointments: "/admin/appointments",
    appointmentDetail: "/admin/appointments/:appointmentId",
    legacyAppointments: "/appointments",
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
    calendarEventDetail: "/DEO/calendar-events/:id",
    legacyCalendarEvents: "/CalendarEvent",
    createEvent: "/DEO/create-event",
    manageEvent: "/DEO/manage-event",
    citizenAppointmentFiles: "/DEO/citizen-appointment-files",
    grievances: "/DEO/grievances",
    grievanceDetail: "/DEO/grievances/:id",
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
  if (role === "admin") return PATHS.admin.dashboard;
  if (role === "minister") return PATHS.minister.dashboard;
  if (role === "deo") return PATHS.deo.calendarEvents;
  return PATHS.citizen.newCase;
}
