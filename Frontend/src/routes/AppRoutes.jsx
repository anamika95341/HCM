import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import AppLayout from "../layouts/AppLayout.jsx";
import { PATHS } from "./paths.js";
import ProtectedRoute from "../shared/auth/ProtectedRoute.jsx";
import AdminCases from "../modules/admin/components/AdminCases.jsx";
import AdminCaseDetail from "../modules/admin/components/AdminCaseDetail.jsx";
import AdminMeeting from "../modules/admin/components/AdminMeeting.jsx";
import OperatorsPage from "../modules/operators/OperatorsPage.jsx";

const LoginPage = lazy(() => import("../modules/auth/LoginPage.jsx"));
const NewCasePage = lazy(() => import("../modules/citizen/pages/NewCasePage.jsx"));
const MyCases = lazy(() => import("../modules/citizen/components/MyCases.jsx"));
const MeetingList = lazy(() => import("../modules/citizen/components/MeetingList.jsx"));
const MeetingDetail = lazy(() => import("../modules/citizen/components/MeetingDetail.jsx"));
const CaseDetailPage = lazy(() => import("../modules/citizen/components/CaseDetailPage.jsx"));
const SettingsPage = lazy(() => import("../modules/settings/SettingsPage.jsx"));
const Calendar = lazy(() => import("../modules/admin/components/Calendar.jsx"));
const MinisterDashboard = lazy(() => import("../modules/minister/MinisterDashboard.jsx"));
const MinisterCalendar = lazy(() => import("../modules/minister/MinisterCalendar.jsx"));
const DeoCalendarEvent = lazy(() => import("../modules/deo/DeoCalendarEvent.jsx"));
const DeoVerifyPage = lazy(() => import("../modules/deo/DeoVerifyPage.jsx"));
const CreateEvent = lazy(() => import("../modules/deo/components/CreateEvent.jsx"));
const ManageEvent = lazy(() => import("../modules/deo/components/ManageEvent.jsx"));
const CitizenMeetingFiles = lazy(() => import("../modules/deo/components/CitizenMeetingFiles.jsx"));
const AdminVerifyPage = lazy(() => import("../modules/admin/AdminVerifyPage.jsx"));
const MasterAdminDashboard = lazy(() => import("../modules/masteradmin/MasterAdminDashboard.jsx"));
const MasterAdminAccessPage = lazy(() => import("../modules/masteradmin/MasterAdminAccessPage.jsx"));

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--portal-bg)",
        color: "var(--portal-text)",
        fontSize: 13,
      }}
    >
      Loading workspace...
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path={PATHS.login} element={<LoginPage defaultRole="citizen" />} />
        <Route path={PATHS.operators} element={<OperatorsPage />} />
        {/* Redirect old role-specific login routes to unified operators page */}
        <Route path={PATHS.adminLogin} element={<Navigate to={PATHS.operators} replace />} />
        <Route path={PATHS.adminVerify} element={<AdminVerifyPage />} />
        <Route path={PATHS.masteradminLogin} element={<LoginPage defaultRole="masteradmin" />} />
        <Route path={PATHS.ministerLogin} element={<Navigate to={PATHS.operators} replace />} />
        <Route path={PATHS.deoLogin} element={<Navigate to={PATHS.operators} replace />} />
        <Route path={PATHS.deo.verify} element={<DeoVerifyPage />} />

        <Route element={<ProtectedRoute allowedRoles={["citizen"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.citizen.home} element={<Navigate to={PATHS.citizen.newCase} replace />} />
            <Route path={PATHS.citizen.newCase} element={<NewCasePage />} />
            <Route path={PATHS.citizen.legacyNewCase} element={<NewCasePage />} />
            <Route path={PATHS.citizen.cases} element={<MyCases />} />
            <Route path={PATHS.citizen.legacyCases} element={<MyCases />} />
            <Route path={PATHS.citizen.meetings} element={<MeetingList />} />
            <Route path={PATHS.citizen.meetingDetail} element={<MeetingDetail />} />
            <Route path={PATHS.citizen.legacyMeetings} element={<MeetingList />} />
            <Route path={PATHS.citizen.caseDetail} element={<CaseDetailPage />} />
            <Route path={PATHS.citizen.legacyCaseDetail} element={<CaseDetailPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["masteradmin"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.masteradmin.dashboard} element={<MasterAdminDashboard />} />
            <Route path={PATHS.masteradmin.createAdmin} element={<MasterAdminAccessPage mode="create-admin" />} />
            <Route path={PATHS.masteradmin.createDeo} element={<MasterAdminAccessPage mode="create-deo" />} />
            <Route path={PATHS.masteradmin.manageAdmins} element={<MasterAdminAccessPage mode="manage-admins" />} />
            <Route path={PATHS.masteradmin.manageDeos} element={<MasterAdminAccessPage mode="manage-deos" />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.admin.workQueue} element={<AdminCases />} />
            <Route path={PATHS.admin.complaintQueue} element={<AdminComplaintQueue />} />
            <Route path={PATHS.admin.calendar} element={<Calendar />} />
            <Route path={PATHS.admin.legacyCalendar} element={<Calendar />} />
            <Route path={PATHS.admin.pool} element={<AdminCases />} />
            <Route path={PATHS.admin.legacyPool} element={<AdminCases />} />
            <Route path={PATHS.admin.cases} element={<AdminCases />} />
            <Route path={PATHS.admin.legacyCases} element={<AdminCases />} />
            <Route path={PATHS.admin.caseDetail} element={<AdminCaseDetail />} />
            <Route path={PATHS.admin.legacyCaseDetail} element={<AdminCaseDetail />} />
            <Route path={PATHS.admin.meetings} element={<AdminMeeting />} />
            <Route path={PATHS.admin.meetingDetail} element={<AdminMeeting />} />
            <Route path={PATHS.admin.legacyMeetings} element={<AdminMeeting />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["minister"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.minister.dashboard} element={<MinisterDashboard />} />
            <Route path={PATHS.minister.calendar} element={<MinisterCalendar />} />
            <Route path={PATHS.minister.legacyDashboard} element={<MinisterDashboard />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["deo"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.deo.calendarEvents} element={<DeoCalendarEvent />} />
            <Route path={PATHS.deo.legacyCalendarEvents} element={<DeoCalendarEvent />} />
            <Route path={PATHS.deo.createEvent} element={<CreateEvent />} />
            <Route path={PATHS.deo.manageEvent} element={<ManageEvent />} />
            <Route path={PATHS.deo.citizenMeetingFiles} element={<CitizenMeetingFiles />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["citizen", "admin", "masteradmin", "deo", "minister"]} />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.settings} element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={PATHS.login} replace />} />
      </Routes>
    </Suspense>
  );
}
