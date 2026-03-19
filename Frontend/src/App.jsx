import './App.css'
import { Routes, Route } from 'react-router-dom'
import Layout from './Components/Layout'
import NewCase from './Pages/Citizen/NewCase'
import Login from './Pages/Login'
import MyCases from './Components/Citizen/MyCases'
import Meeting from './Components/Citizen/Meeting'
import CaseDetail from './Components/Citizen/CaseDetail'
import Setting from './Pages/Setting'
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
        </Route>
      </Routes>
    </>
  )
}

export default App
