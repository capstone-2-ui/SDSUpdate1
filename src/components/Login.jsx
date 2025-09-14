import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    fetch("http://localhost/SDSUpdate1-main/backend/login.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ email, password })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // pass back username + email + role so app can display it
          onLogin({ email: data.user.email, role: data.user.role, username: data.user.username });
          const role = (data.user.role || "").toUpperCase();
          if (role === "ADMIN" || role === "OSA" || role === "GUEST") {
            navigate("/dashboard", { replace: true });
          } else {
            alert("Unauthorized role");
          }
        } else {
          alert(data.message);
        }
      })
      .catch((err) => {
        console.error(err);
        alert("Error connecting to server");
      });
  }

  return (
    <div className="login-page" role="main" aria-label="Login page">
      <div className="login-card" role="form" aria-labelledby="login-title">
        <div className="login-left">
          <img
            src="/RCCLOGO.png"
            alt="RCC Student Discipline System logo"
            className="login-logo"
          />
          <div className="login-title-block">
            <h1 className="login-title">STUDENT</h1>
            <h1 className="login-title">DISCIPLINE</h1>
            <h1 className="login-title">SYSTEM</h1>
          </div>
        </div>
        <div className="login-right">
          <form onSubmit={handleSubmit} className="login-form">
            <label className="input-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="text-input"
              type="email"
              placeholder="johndoe@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="input-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="text-input"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="login-btn" type="submit">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
