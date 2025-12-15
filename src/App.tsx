import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Page from "./Pages/Dashboard";
import Students from "./Pages/Students";
import Posts from "./Pages/Posts";
import Teams from "./Pages/Teams";
import Projects from "./Pages/Projects";
import Managers from "./Pages/Managers";
import Attendance from "./Pages/Attendance";
import UserLayout from "./components/layout/userLayout";
import PrivateRoute from "./auth/PrivateRoute";
import Login from "./auth/Login";


const App = () => {
  return (
    <div>
      <Router>


        <Routes>
          <Route path="/admin/login" element={<Login/>}/>
          <Route path="/" element={<PrivateRoute> <UserLayout /> </PrivateRoute>}>
            <Route index element={<Page />} />
            <Route path="/admin/students" element={<Students />} />
            <Route path="/admin/posts" element={<Posts />} />
            <Route path="/admin/teams" element={<Teams />} />
            <Route path="/admin/projects" element={<Projects />} />
            <Route path="/admin/pm" element={<Managers />} />
            <Route path="/admin/attendance" element={<Attendance />} />
          </Route>


        </Routes>



      </Router>
    </div>
  )
}

export default App
