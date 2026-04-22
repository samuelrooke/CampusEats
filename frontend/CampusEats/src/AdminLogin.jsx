import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutes

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  function checkLoginAttempts() {
    const attempts = JSON.parse(localStorage.getItem("loginAttempts") || '{"count": 0, "timestamp": 0}');
    const now = Date.now();
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      if (now - attempts.timestamp < LOCKOUT_TIME_MS) {
        return false; // Locked out
      } else {
        localStorage.setItem("loginAttempts", JSON.stringify({count: 0, timestamp: now}));
        return true;
      }
    }
    return true;
  }

  function recordFailedAttempt() {
    const attempts = JSON.parse(localStorage.getItem("loginAttempts") || '{"count": 0, "timestamp": 0}');
    attempts.count++;
    attempts.timestamp = Date.now();
    localStorage.setItem("loginAttempts", JSON.stringify(attempts));
    
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      setIsLockedOut(true);
    }
  }

  function clearAttempts() {
    localStorage.setItem("loginAttempts", JSON.stringify({count: 0, timestamp: 0}));
    setIsLockedOut(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!username.trim() || !password) {
      setError("Please enter username and password");
      return;
    }

    if (username.trim().length < 2) {
      setError("Invalid credentials");
      return;
    }

    if (!checkLoginAttempts()) {
      setIsLockedOut(true);
      setError("Too many login attempts. Please try again in 15 minutes.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem("adminToken", token);
        clearAttempts();
        navigate("/admin/dashboard");
      } else {
        recordFailedAttempt();
        setError("Invalid credentials");
      }
    } catch {
      recordFailedAttempt();
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-container">
      <div className="admin-login-card">
        <h1>Admin Login</h1>
        <p className="login-subtitle">Sign in to access the dashboard</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading || isLockedOut}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || isLockedOut}
              autoComplete="off"
            />
          </div>

          <button type="submit" disabled={loading || !username || !password || isLockedOut}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {isLockedOut && (
            <button
              type="button"
              onClick={clearAttempts}
              className="reset-btn"
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                background: "#6b7280",
                color: "#fff",
                padding: "0.375rem 0.75rem",
                border: "none",
                borderRadius: "var(--radius)",
                cursor: "pointer",
              }}
            >
              Reset Lockout
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
