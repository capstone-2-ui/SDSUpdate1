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
  CartesianGrid,
  Legend
} from "recharts";

function DashboardPage({ user }) {
  const [sanctionData, setSanctionData] = useState([]);
  const [violationByDept, setViolationByDept] = useState([]);
  const [monthlyViolations, setMonthlyViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#d2a56a", "#a4702d", "#5b3d1e", "#bfa176", "#8f6a3f"];
  const LINE_COLORS = { total: "#555", minor: "#555", major: "#555" };

  const DASHBOARD_API = "http://192.168.0.134/SDSUpdate1-main/backend/Dashboard.php";
  const INCIDENTS_API = "http://192.168.0.134/SDSUpdate1-main/backend/Incident.php";

  // Helper: robustly extract numeric value from an object using candidate keys
  const extractNumber = (obj = {}, candidates = []) => {
    for (let k of candidates) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[k];
        if (v === null || v === undefined || v === "") return 0;
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
        // Try to parse integers from strings with commas/spaces
        const parsed = parseInt(String(v).replace(/[^0-9\-]/g, ""), 10);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
    return null;
  };

  // Build a canonical key for grouping by department+grade
  const groupKey = (dept, grade) => `${String(dept ?? "—").trim()}||${String(grade ?? "").trim()}`;

  // Try to read common department/grade fields from a record
  const readDeptGrade = (r = {}) => {
    const dept =
      r.department ??
      r.dept ??
      r.department_grade ??
      r.departmentAndGrade ??
      r.departmentName ??
      r.department_name ??
      r.department_and_grade ??
      null;
    const grade =
      r.grade ??
      r.level ??
      r.grade_level ??
      r.year ??
      r.level_name ??
      null;
    return { dept, grade };
  };

  // Normalize department/grade text: trim, remove stray slashes, and detect when department actually holds the grade
  const normalizeDeptGrade = (rawDept, rawGrade) => {
    const clean = (v) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (s === "") return null;
      // remove stray leading/trailing slashes and repeated whitespace
      const s2 = s.replace(/^[\/\s]+|[\/\s]+$/g, "").replace(/\s+/g, " ");
      return s2 === "" ? null : s2;
    };

    let dept = clean(rawDept);
    let grade = clean(rawGrade);

    // If dept looks like a grade (e.g., "Grade 11", "grade11", "G11", "11") and grade is empty, move it to grade.
    const looksLikeGrade = (s) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      if (lower.includes("grade") || /^g\s*\d+/i.test(s) || /^grade\s*\d+/i.test(s)) return true;
      // plain numbers (e.g., "11", "12") might also represent grade
      if (/^\d{1,2}$/.test(s)) return true;
      return false;
    };

    if ((!grade || grade === null) && looksLikeGrade(dept)) {
      grade = dept;
      dept = null;
    }

    // If dept equals grade, clear dept to avoid duplicate listing like "Grade 11 / Grade 11"
    if (dept && grade && dept.toLowerCase() === grade.toLowerCase()) {
      dept = null;
    }

    return { dept, grade };
  };

  // Decide whether an incident record should be considered Major or Minor.
  // We try multiple fields: 'type', 'offense', 'violation_type', 'category', and 'violation' text.
  const isMajorIncident = (rec = {}) => {
    const candidates = [
      rec.type,
      rec.offense,
      rec.violation_type,
      rec.violationType,
      rec.category,
      rec.violation,
      rec.violation_desc,
      rec.number_of_offense,
      rec.offence
    ];
    for (const c of candidates) {
      if (typeof c === "string") {
        const s = c.trim().toLowerCase();
        if (s.includes("major")) return true;
      }
      // numeric 'Major' may appear as descriptor in other shapes; skip
    }
    return false;
  };

  // Decide whether an incident is Minor (fallback when not major)
  const isMinorIncident = (rec = {}) => {
    const candidates = [
      rec.type,
      rec.offense,
      rec.violation_type,
      rec.violationType,
      rec.category,
      rec.violation,
      rec.violation_desc,
      rec.number_of_offense,
      rec.offence
    ];
    for (const c of candidates) {
      if (typeof c === "string") {
        const s = c.trim().toLowerCase();
        if (s.includes("minor")) return true;
        // also treat typical offense numbers as minor (1st, 2nd, 3rd but not 'major')
        if (s === "1st" || s === "2nd" || s === "3rd" || s === "first" || s === "second") return true;
      }
    }
    // If not explicit and not major, we'll treat as minor by default when counting totals.
    return false;
  };

  // Aggregate incidents into a map keyed by department||grade with minor/major counts
  const aggregateFromIncidents = (incidents = []) => {
    const map = new Map();
    for (const rec of incidents) {
      const raw = readDeptGrade(rec);
      const { dept, grade } = normalizeDeptGrade(raw.dept, raw.grade);
      const key = groupKey(dept ?? null, grade ?? null);
      if (!map.has(key)) map.set(key, { dept: dept ?? null, grade: grade ?? null, minor: 0, major: 0, total: 0 });

      const entry = map.get(key);
      const major = isMajorIncident(rec);
      const minor = !major && isMinorIncident(rec);
      if (major) entry.major += 1;
      else if (minor) entry.minor += 1;
      else {
        // unknown: if not classified, count as minor to avoid losing totals
        entry.minor += 1;
      }
      entry.total += 1;
    }
    return map;
  };

  // Compute monthly totals (total, minor, major) from raw incidents list.
  const computeMonthlyFromIncidents = (incidents = []) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthly = months.map((m) => ({ month: m, total: 0, minor: 0, major: 0 }));

    for (const rec of incidents) {
      // Accept created_at and try to parse it
      let created = rec.created_at ?? rec.createdAt ?? rec.date ?? null;
      let monthIndex = null;
      if (created) {
        // Try common formats: YYYY-MM-DD..., timestamp, or JS-friendly format
        const d = new Date(created);
        if (!isNaN(d.getTime())) {
          monthIndex = d.getMonth(); // 0..11
        } else {
          // try to extract month number from YYYY-MM-DD
          const mMatch = String(created).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (mMatch) {
            monthIndex = Number(mMatch[2]) - 1;
          }
        }
      }
      // If we couldn't determine month, skip this record
      if (monthIndex === null || monthIndex < 0 || monthIndex > 11) continue;

      const major = isMajorIncident(rec);
      const minor = !major && isMinorIncident(rec);

      if (major) monthly[monthIndex].major += 1;
      else if (minor) monthly[monthIndex].minor += 1;
      else {
        // fallback counting as minor
        monthly[monthIndex].minor += 1;
      }
      monthly[monthIndex].total += 1;
    }

    return monthly;
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(DASHBOARD_API);
        const data = await res.json();
        // Dashboard.php returns "sanctions" etc — earlier code used 'sanctions' vs 'sanctionData' variable name
        // Keep backward compatibility: accept data.sanctions OR data.sanctionData
        setSanctionData(Array.isArray(data.sanctions) ? data.sanctions : (Array.isArray(data.sanctionData) ? data.sanctionData : []));

        const rawViolations = Array.isArray(data.violationsByDept) ? data.violationsByDept : [];

        const normalized = rawViolations.map((r) => {
          const minorCandidates = ["minor", "minor_count", "minors", "minorTotal", "minor_total", "minor_count_total", "minor_counted"];
          const majorCandidates = ["major", "major_count", "majors", "majorTotal", "major_total", "major_count_total", "major_counted"];
          const totalCandidates = ["violations", "total", "count", "violations_count", "num"];

          const minorVal = extractNumber(r, minorCandidates);
          const majorVal = extractNumber(r, majorCandidates);
          const totalVal = extractNumber(r, totalCandidates);

          const { dept, grade } = readDeptGrade(r);
          const normalizedDG = normalizeDeptGrade(dept, grade);

          return {
            ...r,
            _dept: normalizedDG.dept ?? null,
            _grade: normalizedDG.grade ?? null,
            minor: minorVal != null ? minorVal : null,
            major: majorVal != null ? majorVal : null,
            total: totalVal != null ? totalVal : null,
          };
        });

        // If normalized rows have no explicit minor/major info, try to fetch incidents and compute
        const needAggregation = normalized.length > 0 && normalized.every((r) => r.minor == null && r.major == null);
        let incidentsMap = null;
        let incidentsList = null;

        if (needAggregation) {
          try {
            const incRes = await fetch(INCIDENTS_API);
            const incData = await incRes.json();
            const incidents = Array.isArray(incData) ? incData : (Array.isArray(incData.data) ? incData.data : []);
            incidentsList = incidents;
            if (incidents.length > 0) {
              incidentsMap = aggregateFromIncidents(incidents);
            }
          } catch (e) {
            console.warn("Failed to fetch incidents for aggregation:", e);
            incidentsMap = null;
            incidentsList = null;
          }
        }

        // Merge aggregated counts into normalized rows (when available). Also include rows that appear only in incidents.
        const mergedMap = new Map();

        // First add normalized rows (normalize their keys and merge duplicates)
        for (const r of normalized) {
          const normalizedDG = normalizeDeptGrade(r._dept, r._grade);
          const key = groupKey(normalizedDG.dept ?? null, normalizedDG.grade ?? null);

          const minor = r.minor != null ? Number(r.minor) : null;
          const major = r.major != null ? Number(r.major) : null;
          const total = r.total != null ? Number(r.total) : null;

          if (!mergedMap.has(key)) {
            mergedMap.set(key, {
              department: normalizedDG.dept ?? null,
              grade: normalizedDG.grade ?? null,
              minor: minor,
              major: major,
              total: total
            });
          } else {
            // sum counts when duplicate normalized rows exist
            const ex = mergedMap.get(key);
            ex.minor = (ex.minor || 0) + (minor || 0);
            ex.major = (ex.major || 0) + (major || 0);
            ex.total = (ex.total || 0) + (total || 0);
            mergedMap.set(key, ex);
          }
        }

        // Merge incidents-derived aggregates
        if (incidentsMap) {
          for (const [k, v] of incidentsMap.entries()) {
            if (mergedMap.has(k)) {
              const existing = mergedMap.get(k);
              existing.minor = (existing.minor != null ? existing.minor : 0) + (v.minor || 0);
              existing.major = (existing.major != null ? existing.major : 0) + (v.major || 0);
              existing.total = (existing.total != null ? existing.total : 0) + (v.total || 0);
              mergedMap.set(k, existing);
            } else {
              mergedMap.set(k, { department: v.dept ?? null, grade: v.grade ?? null, minor: v.minor || 0, major: v.major || 0, total: v.total || 0 });
            }
          }
        }

        // If dashboard had no rows at all, but incidents produced rows, use incidentsMap
        if (normalized.length === 0 && incidentsMap) {
          for (const [k, v] of incidentsMap.entries()) {
            mergedMap.set(k, { department: v.dept ?? null, grade: v.grade ?? null, minor: v.minor || 0, major: v.major || 0, total: v.total || 0 });
          }
        }

        // Convert mergedMap to array in stable order
        const finalRows = Array.from(mergedMap.values()).map((r) => ({
          ...r,
        }));

        setViolationByDept(finalRows);

        // monthlyViolations returned by backend
        const dashboardMonthly = Array.isArray(data.monthlyViolations) ? data.monthlyViolations : [];

        // Normalize dashboard monthly array to objects {month, total, minor, major}
        const normalizedMonthly = (dashboardMonthly.length > 0)
          ? dashboardMonthly.map((m) => ({
              month: m.month ?? m.label ?? m.name ?? "",
              total: extractNumber(m, ["total","count","violations","value"]) ?? 0,
              minor: (m.minor !== undefined ? extractNumber(m, ["minor","minor_count","minors"]) : undefined),
              major: (m.major !== undefined ? extractNumber(m, ["major","major_count","majors"]) : undefined)
            }))
          : [];

        // Decide if dashboard already contains minor/major per month
        const hasMinorMajor = normalizedMonthly.length > 0 && normalizedMonthly.every((m) => m.minor !== undefined && m.major !== undefined);

        if (hasMinorMajor) {
          // ensure numbers
          const mm = normalizedMonthly.map((m) => ({ month: m.month, total: Number(m.total || 0), minor: Number(m.minor || 0), major: Number(m.major || 0) }));
          setMonthlyViolations(mm);
        } else {
          // --- KEY CHANGE ---
          // If the dashboard did not provide minor/major per month, fetch incidents directly
          // (the same source used for the "Total of Students Violations" table) and compute monthly minor/major.
          let incidents = incidentsList;
          try {
            // Fetch incidents even if incidentsList is null, to ensure we compute minor/major correctly from DB
            const incRes = await fetch(INCIDENTS_API);
            const incData = await incRes.json();
            incidents = Array.isArray(incData) ? incData : (Array.isArray(incData.data) ? incData.data : []);
          } catch (e) {
            // if the fetch fails, incidents will remain what it was (likely null)
            console.warn("Failed to fetch incidents for monthly minor/major computation:", e);
          }

          if (incidents && incidents.length > 0) {
            const computed = computeMonthlyFromIncidents(incidents);
            setMonthlyViolations(computed);
          } else if (normalizedMonthly.length > 0) {
            // fall back to dashboard totals only (fill null -> 0 for minor/major)
            const mm = normalizedMonthly.map((m) => ({ month: m.month, total: Number(m.total || 0), minor: Number(m.minor || 0) || 0, major: Number(m.major || 0) || 0 }));
            setMonthlyViolations(mm);
          } else {
            // no data at all
            setMonthlyViolations([]);
          }
        }
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

  // compute aggregated totals shown below the chart
  const totals = monthlyViolations.reduce((acc, m) => {
    acc.total += Number(m.total || 0);
    acc.minor += Number(m.minor || 0);
    acc.major += Number(m.major || 0);
    return acc;
  }, { total: 0, minor: 0, major: 0 });

  // Custom tooltip for the LineChart: shows total / minor / major on hover
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    // payload[0].payload should contain the original data object for the hovered point
    const dataPoint = (payload[0] && payload[0].payload) || {};
    const fmt = (v) => Number(v || 0);

    return (
      <div style={{ background: "#fff", border: "1px solid #ddd", padding: 8, borderRadius: 6, minWidth: 140 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
        <div style={{ marginBottom: 4 }}>Total: <strong>{fmt(dataPoint.total)}</strong></div>
        <div style={{ color: LINE_COLORS.minor, marginBottom: 4 }}>Minor: <strong>{fmt(dataPoint.minor)}</strong></div>
        <div style={{ color: LINE_COLORS.major }}>Major: <strong>{fmt(dataPoint.major)}</strong></div>
      </div>
    );
  };

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
                  label={false}
                  labelLine={false}
                  stroke="#fff"
                  strokeWidth={2}
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
                  <span className="dot" style={{ background: COLORS[index % COLORS.length] }}></span>
                  <span className="legend-name">{entry.name}</span>
                  <span className="legend-count"> — {entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Table of Violations */}
        <div className="card">
          <h3>Total of Students Violations</h3>
          <div className="table-scroll-container">
            <div className="table-body-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Department / Grade</th>
                    <th>Minor</th>
                    <th>Major</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={3}>Loading...</td>
                    </tr>
                  )}
                  {!loading && violationByDept.length === 0 && (
                    <tr>
                      <td colSpan={3}>No data</td>
                    </tr>
                  )}
                  {violationByDept.map((row, index) => {
                    // Prefer explicit minor/major if present; fallback to total->minor if necessary
                    const minorCount = (row.minor != null) ? Number(row.minor) : (row.total != null ? Number(row.total) : 0);
                    const majorCount = (row.major != null) ? Number(row.major) : 
                      // If total present and minor present, infer major as total-minor
                      (row.total != null && row.minor != null ? Math.max(0, Number(row.total) - Number(row.minor)) : 0);

                    const deptText = row.department ? String(row.department).trim() : null;
                    const gradeText = row.grade ? String(row.grade).trim() : null;
                    const label = deptText ? (gradeText ? `${deptText} / ${gradeText}` : deptText) : (gradeText ? gradeText : "—");

                    return (
                      <tr key={index}>
                        <td>{label}</td>
                        <td>{Number(minorCount) || 0}</td>
                        <td>{Number(majorCount) || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Violation Trends Line Chart */}
        <div className="card">
          <h3>Student Violation Data</h3>
          <p style={{ fontSize: 14, color: "#555" }}>Total Violation Trends</p>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyViolations}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} domain={[0, 100]} ticks={[0,20,40,60,80,100]}  />
              {/* Replace the simple Tooltip with our custom tooltip */}
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="total" stroke={LINE_COLORS.total} strokeWidth={2} dot={{ r: 3 }} name="Total" />
              <Line type="monotone" dataKey="minor" stroke={LINE_COLORS.minor} strokeDasharray="5 3" strokeWidth={2} dot={{ r: 3 }} name="Minor" />
              <Line type="monotone" dataKey="major" stroke={LINE_COLORS.major} strokeDasharray="3 3" strokeWidth={2} dot={{ r: 3 }} name="Major" />
            </LineChart>
          </ResponsiveContainer>

        </div>
      </div>
    </div>
  );
}

export default DashboardPage; 