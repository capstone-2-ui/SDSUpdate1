import React, { useEffect, useState } from "react";
import "./DashboardPage.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

function DashboardPage({ user }) {
  const [sanctionData, setSanctionData] = useState([]);
  const [violationByDept, setViolationByDept] = useState([]);
  const [monthlyViolations, setMonthlyViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#d2a56a", "#a4702d", "#5b3d1e", "#bfa176", "#8f6a3f"];

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://localhost/SDSUpdate1-main/backend/Dashboard.php");
        const data = await res.json();
        // Backend returns arrays shaped as:
        // { sanctions: [{name, value}], violationsByDept: [{department, violations}], monthlyViolations: [{month, total}] }
        setSanctionData(Array.isArray(data.sanctions) ? data.sanctions : []);
        setViolationByDept(Array.isArray(data.violationsByDept) ? data.violationsByDept : []);
        setMonthlyViolations(Array.isArray(data.monthlyViolations) ? data.monthlyViolations : []);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setSanctionData([]);
        setViolationByDept([]);
        setMonthlyViolations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    // Optional: poll every X minutes by setInterval (not added by default)
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header-bar">
        <h1 className="dashboard-title">Dashboard</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {/* Active Sanction Chart */}
        <div className="card">
          <h3>Active Sanction</h3>
          <div className="chart-section">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie
                  data={sanctionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {sanctionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <ul className="legend">
              {sanctionData.length === 0 && !loading && <li>No sanction data</li>}
              {sanctionData.map((entry, index) => (
                <li key={index}>
                  <span className={`dot`} style={{ background: COLORS[index % COLORS.length] }}></span>
                  {entry.name} — {entry.value}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Table of Violations */}
        <div className="card">
          <h3>Total of Students & Violations</h3>
          <div className="table-scroll-container">
            <table>
              <thead>
                <tr>
                  <th>Department / Grade</th>
                  <th>Violations</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={2}>Loading...</td>
                  </tr>
                )}
                {!loading && violationByDept.length === 0 && (
                  <tr>
                    <td colSpan={2}>No data</td>
                  </tr>
                )}
                {violationByDept.map((row, index) => (
                  <tr key={index}>
                    <td>{row.department}</td>
                    <td>{row.violations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Violation Trends Line Chart */}
        <div className="card">
          <h3>Student Violation Data</h3>
          <p style={{ fontSize: 14, color: "#555" }}>Total Violation Trends</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyViolations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} domain={[0, 100]} ticks={[0,20,40,60,80,100]} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
