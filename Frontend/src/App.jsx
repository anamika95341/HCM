import "./App.css";
import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./Components/Layout";
import Login from "./Pages/Login";

const NewCase = lazy(() => import("./Pages/Citizen/NewCase"));
const MyCases = lazy(() => import("./Components/Citizen/MyCases"));
const Meeting = lazy(() => import("./Components/Citizen/Meeting"));
const CaseDetail = lazy(() => import("./Components/Citizen/CaseDetail"));
const Setting = lazy(() => import("./Pages/Setting"));
const Calendar = lazy(() => import("./Components/Admin/Calendar"));
const AdminAllCases = lazy(() => import("./Components/Admin/AdminAllCases"));
const AdminCases = lazy(() => import("./Components/Admin/AdminCases"));
const AdminCaseDetail = lazy(() => import("./Components/Admin/AdminCaseDetail"));
const AdminMeeting = lazy(() => import("./Components/Admin/AdminMeeting"));
const MinisterDashboard = lazy(() => import("./Components/Minister/MinisterDashboard"));
const DeoCalendarEvent = lazy(() => import("./Components/DEO/DeoCalendarEvent"));

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
        fontSize: 14,
      }}
    >
      Loading workspace...
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/newcase" element={<NewCase />} />
          <Route path="/citizencase" element={<MyCases />} />
          <Route path="/meeting" element={<Meeting />} />
          <Route path="/case/:id" element={<CaseDetail />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/adminallcases" element={<AdminAllCases />} />
          <Route path="/admincases" element={<AdminCases />} />
          <Route path="/admincasedetail" element={<AdminCaseDetail />} />
          <Route path="/meetings" element={<AdminMeeting />} />
          <Route path="/ministerdashboard" element={<MinisterDashboard />} />
          <Route path="/CalendarEvent" element={<DeoCalendarEvent />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
