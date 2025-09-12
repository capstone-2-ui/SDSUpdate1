import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Login from "./components/Login";

// Pages
import DashboardPage from "./pages/DashboardPage";
import StudentIncidentPage from "./pages/StudentIncidentPage";
import ViolationPage from "./pages/ViolationPage";
import SanctionPage from "./pages/SanctionPage";
import DepartmentPage from "./pages/DepartmentPage";
import GradePage from "./pages/GradePage";
import SectionPage from "./pages/SectionPage";
import StrandPage from "./pages/StrandPage";
import UserPage from "./pages/UserPage";
import ReportPage from "./pages/ReportPage";
import IncidentPage from "./pages/IncidentPage";

import "./App.css";

function App() {
  const [user, setUser] = useState(null);

  function handleLogin(userInfo) {
    setUser(userInfo);
  }

  function handleLogout() {
    setUser(null);
  }

  // Protect Admin-only routes
  function AdminRoute({ element, ...rest }) {
    const elementWithProps = React.cloneElement(element, { ...rest });
    return user?.role === "ADMIN" ? elementWithProps : <Navigate to="/dashboard" replace />;
  }

  // Protect Guest-only routes
  function GuestRoute({ element }) {
    return user?.role === "GUEST" ? element : <Navigate to="/dashboard" replace />;
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      ) : (
        <div className="app-container">
          {/* ✅ Pass user to Sidebar */}
          <Sidebar onLogout={handleLogout} user={user} />

          <main className="main-content">
            <Routes>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* ✅ Shared: Admin + OSA */}
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
              <Route path="/student-incident" element={<StudentIncidentPage />} />

              {/* ✅ Admin only routes */}
              <Route path="/violation" element={<AdminRoute element={<ViolationPage />} />} />
              <Route path="/sanction" element={<AdminRoute element={<SanctionPage />} />} />
              <Route path="/department" element={<AdminRoute element={<DepartmentPage />} />} />
              <Route path="/grade" element={<AdminRoute element={<GradePage />} />} />
              <Route path="/section" element={<AdminRoute element={<SectionPage />} />} />
              <Route path="/strand" element={<AdminRoute element={<StrandPage />} />} />
              <Route path="/user" element={<AdminRoute element={<UserPage onLogout={handleLogout} />} />} />
              <Route path="/report" element={<AdminRoute element={<ReportPage />} />} />
              <Route path="/incident" element={<AdminRoute element={<IncidentPage />} />} />

              {/* ✅ Guest only routes */}
              <Route path="/dashboard" element={<GuestRoute element={<DashboardPage />} />} />
              <Route path="/student-incident" element={<GuestRoute element={<StudentIncidentPage />} />} />

              {/* Catch-all */}
              <Route path="*" element={<h2>Page not found</h2>} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
