import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    setOpen(false);
    if (onLogout) onLogout();
    navigate("/", { replace: true });
  }

  const displayName = user?.username || user?.email || user?.role || "User";
  const displayRole = user?.role || "";

  return (
    <header className="app-header">
      <div className="app-header-left" />
      <div className="app-header-right" ref={menuRef}>
        {/* White pill container */}
        <div className="header-pill" role="button" aria-haspopup="true" aria-expanded={open}>
          <img src="/rcclogo.png" alt="RCC Logo" className="pill-logo" />
          <div className="pill-user">
            <div className="pill-user-name">{displayName}</div>
            <div className="pill-user-role">{displayRole}</div>
          </div>
          <button
            className="pill-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open user menu"
          >
            ▾
          </button>
        </div>

        {open && (
          <div className="header-dropdown" role="menu">
            <button className="header-dropdown-item" onClick={handleLogout} role="menuitem">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}