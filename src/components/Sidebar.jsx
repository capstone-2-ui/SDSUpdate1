// Sidebar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({ onLogout, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  // Full menu list
  const items = [
    { to: "/dashboard", label: "Dashboard", key: "dashboard" },
    { to: "/student-incident", label: "Student / Incident Management", key: "student" },
    { to: "/violation", label: "Violation Management", key: "violation" },
    { to: "/sanction", label: "Sanction Management", key: "sanction" },
    { to: "/department", label: "Department Management", key: "department" },
    { to: "/grade", label: "Grade Management", key: "grade" },
    { to: "/section", label: "Section Management", key: "section" },
    { to: "/strand", label: "Strand Management", key: "strand" },
    { to: "/user", label: "User Management", key: "user" },
    { to: "/report", label: "Report Management", key: "report" },
  ];

  // Restrict menu items if OSA
  const filteredItems =
    user?.role === "OSA"
      ? items.filter((it) => it.key === "dashboard" || it.key === "student")
      : user?.role === "GUEST"
      ? items.filter((it) => it.key === "dashboard" || it.key === "student")
      : items;

  // Icons (same as before)
  const icons = {
    dashboard: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <rect x="3" y="3" width="7" height="7" rx="2" fill="white" />
        <rect x="12" y="3" width="7" height="7" rx="2" fill="white" />
        <rect x="3" y="12" width="7" height="7" rx="2" fill="white" />
        <rect x="12" y="12" width="7" height="7" rx="2" fill="white" />
      </svg>
    ),
    student: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <path
          d="M11 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 
             1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2
             c0-2.66-5.33-4-8-4z"
          fill="white"
        />
      </svg>
    ),
    violation: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="9" stroke="white" strokeWidth="2" />
        <rect x="10" y="6" width="2" height="6" rx="1" fill="white" />
        <rect x="10" y="14" width="2" height="2" rx="1" fill="white" />
      </svg>
    ),
    sanction: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <rect x="5" y="3" width="12" height="16" rx="2" fill="white" />
        <rect x="8" y="6" width="6" height="1.5" rx="0.75" fill="#8c6239" />
        <rect x="8" y="9" width="6" height="1.5" rx="0.75" fill="#8c6239" />
        <rect x="8" y="12" width="6" height="1.5" rx="0.75" fill="#8c6239" />
      </svg>
    ),
    department: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <circle cx="11" cy="7" r="3" fill="white" />
        <rect x="4" y="14" width="14" height="4" rx="2" fill="white" />
        <rect x="1" y="18" width="20" height="2" rx="1" fill="#8c6239" />
      </svg>
    ),
    grade: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <circle cx="11" cy="7" r="4" fill="white" />
        <rect x="7" y="13" width="8" height="6" rx="2" fill="white" />
        <rect x="10" y="16" width="2" height="3" rx="1" fill="#8c6239" />
      </svg>
    ),
    section: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <ellipse cx="11" cy="7" rx="7" ry="3" fill="white" />
        <rect x="4" y="10" width="14" height="7" rx="3.5" fill="white" />
        <rect x="8" y="13" width="6" height="2" rx="1" fill="#8c6239" />
      </svg>
    ),
    strand: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <rect x="4" y="4" width="14" height="14" rx="3" fill="white" />
        <rect x="7" y="7" width="8" height="2" rx="1" fill="#8c6239" />
        <rect x="7" y="11" width="8" height="2" rx="1" fill="#8c6239" />
      </svg>
    ),
    user: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <circle cx="11" cy="8" r="4" fill="white" />
        <rect x="5" y="14" width="12" height="5" rx="2.5" fill="white" />
      </svg>
    ),
    report: (
      <svg width="22" height="22" fill="none" viewBox="0 0 22 22">
        <rect x="4" y="3" width="14" height="16" rx="2" fill="white" />
        <rect x="7" y="7" width="8" height="2" rx="1" fill="#8c6239" />
        <rect x="7" y="11" width="8" height="2" rx="1" fill="#8c6239" />
        <rect x="7" y="15" width="8" height="2" rx="1" fill="#8c6239" />
      </svg>
    ),
  };

  function handleLogoutClick() {
    if (onLogout) onLogout();
    navigate("/", { replace: true });
  }

  return (
    <aside className={`rcc-sidebar${collapsed ? " collapsed" : ""}`} aria-label="Main sidebar">
      {/* Logo + Title */}
      <div className="rcc-brand">
        <div className="rcc-logo">
          <img src="/RCCLOGO.png" alt="App Logo" className="rcc-logo-img" />
        </div>
        {!collapsed && (
          <div className="rcc-brand-text">
            <div className="rcc-title">Student</div>
            <div className="rcc-subtitle">Discipline System</div>
          </div>
        )}
      </div>

      {/* Collapse button */}
      <button
        className="rcc-collapse-btn"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M8 5L13 10L8 15" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 5L7 10L12 15" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Nav links */}
      <nav className="rcc-nav" aria-label="Main navigation">
        {filteredItems.map((it) => (
          <NavLink
            key={it.key}
            to={it.to}
            className={({ isActive }) => "rcc-nav-item" + (isActive ? " active" : "")}
            end
          >
            <span className="rcc-icon" aria-hidden="true">
              {icons[it.key]}
            </span>
            {!collapsed && <span className="rcc-label">{it.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
