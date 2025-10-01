import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Login from "./components/Login";
import ProtectedRoute from "./components/ProtectedRoute";

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
 - On mount the app always attempts to restore a server-side session by calling backend/login.php
   with credentials included. While that check is in progress a small loading state is shown.
 - When the server returns a session the app sets `user` and persists a localStorage flag so refreshes
   after a login remain logged in.
 - onLogin keeps the existing behavior (set local flag + user); onLogout clears both.
*/

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const LOCAL_FLAG = "sds_logged_in";

  // On mount: attempt to restore session only if the client-side login flag exists.
  useEffect(() => {
    const clientFlag = (() => {
      try {
        return localStorage.getItem(LOCAL_FLAG);
      } catch (e) {
        return null;
      }
    })();

    // If the client flag is missing, don't try to restore a session.
    // This prevents the app from re-entering the dashboard after a logout
    // even if the server still has a session cookie.
    if (clientFlag !== "1") {
      setLoading(false);
      setUser(null);
      return;
    }

    // Otherwise, attempt to restore a server session (best-effort).
    setLoading(true);
    fetch("http://192.168.100.88/SDSUpdate1-main/backend/login.php", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.user) {
          const normalizedUser = {
            ...data.user,
            role: (data.user.role || "").toUpperCase(),
          };
          setUser(normalizedUser);
          // Ensure client flag is set (redundant but harmless).
          try {
            localStorage.setItem(LOCAL_FLAG, "1");
          } catch (e) {
            // ignore localStorage errors
          }
        } else {
          // No valid server session: clear client flag and user
          try {
            localStorage.removeItem(LOCAL_FLAG);
          } catch (e) {
            // ignore
          }
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Session restore failed:", err);
        try {
          localStorage.removeItem(LOCAL_FLAG);
        } catch (e) {
          // ignore
        }
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
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
    fetch("http://192.168.100.88/SDSUpdate1-main/backend/logout.php", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      /* ignore errors, session cleanup is best-effort */
    });
  }

  // Show loading while restoring session
  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      {!user ? (
        <Routes>
          <Route path="/*" element={<Login onLogin={handleLogin} />} />
        </Routes>
      ) : (
        <div className="app-container">
          <Sidebar onLogout={handleLogout} user={user} />

          <main className="main-content">
            <Header user={user} onLogout={handleLogout} />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN", "OSA", "GUEST"]}>
                    <DashboardPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student-incident"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN", "OSA", "GUEST"]}>
                    <StudentIncidentPage user={user} />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/violation"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <ViolationPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sanction"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <SanctionPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/department"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <DepartmentPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grade"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <GradePage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/section"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <SectionPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strand"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <StrandPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <UserPage user={user} onLogout={handleLogout} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/report"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <ReportPage user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incident"
                element={
                  <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                    <IncidentPage user={user} />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<h2>Page not found</h2>} />
            </Routes>
          </main>
        </div>
      )}
    </Router>
  );
}

export default App;
