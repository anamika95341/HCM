import './App.css'
import { Routes, Route } from 'react-router-dom'
import Layout from './Components/Layout'
import NewCase from './Pages/Citizen/NewCase'
import Login from './Pages/Login'
import MyCases from './Components/Citizen/MyCases'
import Meeting from './Components/Citizen/Meeting'
import CaseDetail from './Components/Citizen/CaseDetail'
import Setting from './Pages/Setting'
import Calendar from './Components/Admin/Calendar'
import AdminAllCases from './Components/Admin/AdminAllCases'
import AdminCases from './Components/Admin/AdminCases'
import AdminCaseDetail from './Components/Admin/AdminCaseDetail'
import AdminMeeting from './Components/Admin/AdminMeeting'
import MinisterDashboard from './Components/Minister/MinisterDashboard'
import DeoCalendarEvent from './Components/DEO/DeoCalendarEvent'
function App() {

  return (
    <>
      {/* <Layout /> */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          <Route path='/newcase' element={<NewCase />} />
          <Route path='/citizencase' element={<MyCases />} />
          <Route path='/meeting' element={<Meeting />} />
          <Route path='/case/:id' element={<CaseDetail />} />
          <Route path='/setting' element={<Setting />} />
          <Route path='/calendar' element={<Calendar />} />
          <Route path='/adminallcases' element={<AdminAllCases />} />
          <Route path='/admincases' element={<AdminCases />} />
          <Route path='/admincasedetail' element={<AdminCaseDetail />} />
          <Route path='/Meetings' element={<AdminMeeting />} />
          <Route path='/ministerdashboard' element={<MinisterDashboard />} />
          <Route path='//CalendarEvent' element={<DeoCalendarEvent />} />
        
        </Route>
      </Routes>
    </>
  )
}

export default App
