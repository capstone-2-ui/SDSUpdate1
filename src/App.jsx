import React, { useState, useEffect } from "react";
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

/*
 Behavior implemented:
 - On cold start (no local flag), app shows Login even if server has a session cookie.
 - When the user successfully logs in, we set a localStorage flag ("sds_logged_in" = "1")
   and set `user` state. After that, page refreshes will try to restore the session from the
   server (so the user stays logged in across refreshes).
 - On logout we clear the local flag and user state (and call backend logout if available).
*/

function App() {
  const [user, setUser] = useState(null);
  const LOCAL_FLAG = "sds_logged_in";

  // On mount: only attempt session restore if the local flag is set.
  // This prevents automatic restore on cold start (so the Login page is shown first).
  useEffect(() => {
    const flagged = localStorage.getItem(LOCAL_FLAG);
    if (!flagged) {
      // No client-side login flag — don't restore session automatically.
      // The app will show Login because `user` remains null.
      return;
    }

    // If flagged, attempt to restore session from backend (server cookie must be present).
    fetch("http://localhost/SDSUpdate1-main/backend/login.php", {
      method: "GET",
      credentials: "include", // send cookies so server can validate session
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.user) {
          const normalizedUser = {
            ...data.user,
            role: (data.user.role || "").toUpperCase(),
          };
          setUser(normalizedUser);
        } else {
          // server didn't return a session — clear client flag to avoid future auto-restores
          localStorage.removeItem(LOCAL_FLAG);
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Session restore failed:", err);
        // network error — keep client flagged (optionally) or remove flag to require re-login
        // We'll remove the flag to be safe; you can change this to keep the flag if you prefer.
        localStorage.removeItem(LOCAL_FLAG);
        setUser(null);
      });
  }, []);

  // Called by <Login onLogin={handleLogin} />
  function handleLogin(userInfo) {
    // normalize role to uppercase to match your existing checks (ADMIN/GUEST/OSA)
    const normalized = {
      ...userInfo,
      role: (userInfo.role || "").toUpperCase(),
    };

    // Persist flag so refreshes attempt to restore session
    try {
      localStorage.setItem(LOCAL_FLAG, "1");
    } catch (e) {
      console.warn("Could not write login flag to localStorage:", e);
    }

    setUser(normalized);
  }

  // Called when user clicks logout (Sidebar or wherever)
  function handleLogout() {
    // Clear local client flag and user state
    try {
      localStorage.removeItem(LOCAL_FLAG);
    } catch (e) {
      console.warn("Could not remove localStorage flag:", e);
    }
    setUser(null);

    // OPTIONAL: tell backend to destroy server session if endpoint exists.
    // It's safe to call even if logout.php is missing; ignore errors.
    fetch("http://localhost/SDSUpdate1-main/backend/logout.php", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* ignore errors, session cleanup is best-effort */
    });
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
        // When user is not set, always render Login as the app root.
        <Routes>
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      ) : (
        <div className="app-container">
          <Sidebar onLogout={handleLogout} user={user} />

          <main className="main-content">
            <Routes>
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Shared: Admin + OSA */}
              <Route path="/dashboard" element={<DashboardPage user={user} />} />
              <Route path="/student-incident" element={<StudentIncidentPage />} />

              {/* Admin only routes */}
              <Route path="/violation" element={<AdminRoute element={<ViolationPage />} />} />
              <Route path="/sanction" element={<AdminRoute element={<SanctionPage />} />} />
              <Route path="/department" element={<AdminRoute element={<DepartmentPage />} />} />
              <Route path="/grade" element={<AdminRoute element={<GradePage />} />} />
              <Route path="/section" element={<AdminRoute element={<SectionPage />} />} />
              <Route path="/strand" element={<AdminRoute element={<StrandPage />} />} />
              <Route path="/user" element={<AdminRoute element={<UserPage onLogout={handleLogout} />} />} />
              <Route path="/report" element={<AdminRoute element={<ReportPage />} />} />
              <Route path="/incident" element={<AdminRoute element={<IncidentPage />} />} />

              {/* Guest only routes */}
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
