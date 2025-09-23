// ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles, children }) {
  // If no user from props, try localStorage
  const storedUser = localStorage.getItem("user");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;

  const activeUser = user || parsedUser;

  if (!activeUser) {
    return <Navigate to="/" replace />; // not logged in
  }

  if (!allowedRoles.includes(activeUser.role)) {
    return <Navigate to="/dashboard" replace />; // redirect if no access
  }

  return children;
}
