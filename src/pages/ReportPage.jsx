// src/pages/ReportPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FaFileExport, FaFilter } from "react-icons/fa";
import "./ReportPage.css";

const INCIDENT_URL = "http://localhost/SDSUpdate1-main/backend/Incident.php";
const GRADE_URL = "http://localhost/SDSUpdate1-main/backend/Grade.php";
const SECTION_URL = "http://localhost/SDSUpdate1-main/backend/Section.php";
const STRAND_URL = "http://localhost/SDSUpdate1-main/backend/Strand.php";
const DEPARTMENT_URL = "http://localhost/SDSUpdate1-main/backend/Department.php";

const ReportPage = () => {
  const [filters, setFilters] = useState({
    alphabetical: "",
    disciplinary: "",
    department: "",
    year: "",
    section: "",
    grade: "",
    violation: "",
    sanction: "",
    status: [],
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState({ open: false, item: null });

  // dropdown option sources (fetched)
  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [strandOptions, setStrandOptions] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);

  // refs for placement and outside-click handling (matches StudentIncidentPage pattern)
  const filterContainerRef = useRef(null);
  const filterBtnRef = useRef(null);

  // Fetch incidents
  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      try {
        const res = await fetch(INCIDENT_URL);
        const data = await res.json();
        const normalized = Array.isArray(data)
          ? data.map((r) => ({
              id: r.id,
              student_id:
                r.student_id ??
                r.studentId ??
                r.student?.student_id ??
                r.student?.id ??
                r.id,
              name:
                r.name ??
                r.student_name ??
                r.student?.name ??
                r.student?.fullName ??
                "",
              department:
                r.department ??
                r.dept ??
                r.student?.department ??
                r.student?.dept ??
                "",
              grade:
                r.grade ??
                r.year ??
                r.level ??
                r.student?.grade ??
                r.student?.year ??
                "",
              year:
                r.year ?? r.grade ?? r.student?.year ?? r.student?.grade ?? "",
              section:
                r.section ??
                r.sec ??
                r.section_name ??
                r.student?.section ??
                "",
              violation: r.violation ?? r.description ?? "",
              sanction: r.sanction ?? "",
              status: r.status ?? "",
            }))
          : [];
        if (mounted) setReports(normalized);
      } catch (err) {
        console.error("Error fetching incidents:", err);
        if (mounted) setReports([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReports();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch dropdown lists the same way StudentIncidentPage does
  useEffect(() => {
    let mounted = true;
    const fetchLists = async () => {
      try {
        const [gRes, sRes, stRes, dRes] = await Promise.allSettled([
          fetch(GRADE_URL),
          fetch(SECTION_URL),
          fetch(STRAND_URL),
          fetch(DEPARTMENT_URL),
        ]);

        if (!mounted) return;

        if (gRes.status === "fulfilled") {
          try {
            const gData = await gRes.value.json();
            setGradeOptions(
              Array.isArray(gData)
                ? gData
                    .map((x) => x.grade ?? x.name ?? x.grade_name ?? String(x))
                    .filter(Boolean)
                    .sort()
                : []
            );
          } catch (e) {
            setGradeOptions([]);
          }
        }

        if (sRes.status === "fulfilled") {
          try {
            const sData = await sRes.value.json();
            setSectionOptions(
              Array.isArray(sData)
                ? sData
                    .map((x) => x.section ?? x.name ?? x.section_name ?? String(x))
                    .filter(Boolean)
                    .sort()
                : []
            );
          } catch (e) {
            setSectionOptions([]);
          }
        }

        if (stRes.status === "fulfilled") {
          try {
            const stData = await stRes.value.json();
            setStrandOptions(
              Array.isArray(stData)
                ? stData
                    .map((x) => x.strand ?? x.name ?? String(x))
                    .filter(Boolean)
                    .sort()
                : []
            );
          } catch (e) {
            setStrandOptions([]);
          }
        }

        if (dRes.status === "fulfilled") {
          try {
            const dData = await dRes.value.json();
            setDepartmentOptions(
              Array.isArray(dData)
                ? dData
                    .map((x) => x.department ?? x.name ?? x.dept ?? String(x))
                    .filter(Boolean)
                    .sort()
                : []
            );
          } catch (e) {
            setDepartmentOptions([]);
          }
        }
      } catch (err) {
        console.error("Error fetching dropdown lists:", err);
      }
    };

    fetchLists();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFilterChange = (name, value) =>
    setFilters((prev) => ({ ...prev, [name]: value }));

  const clearFilters = () =>
    setFilters({
      alphabetical: "",
      disciplinary: "",
      department: "",
      year: "",
      section: "",
      grade: "",
      violation: "",
      sanction: "",
      status: [],
    });

  // close filter when clicking outside (matches StudentIncidentPage)
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // derived option lists (fallback to reports data)
  const derivedDepartments = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.department || "").trim()).filter(Boolean))).sort(),
    [reports]
  );
  const derivedYears = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.year || "").toString()).filter(Boolean))).sort(),
    [reports]
  );
  const derivedGrades = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.grade || "").toString()).filter(Boolean))).sort(),
    [reports]
  );
  const derivedSections = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.section || "").trim()).filter(Boolean))).sort(),
    [reports]
  );
  const derivedViolations = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.violation || "").trim()).filter(Boolean))).sort(),
    [reports]
  );
  const derivedSanctions = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => (r.sanction || "").trim()).filter(Boolean))).sort(),
    [reports]
  );

  const departments = departmentOptions.length ? departmentOptions : derivedDepartments;
  const years = derivedYears;
  const grades = gradeOptions.length ? gradeOptions : derivedGrades;
  const sections = sectionOptions.length ? sectionOptions : derivedSections;
  const violations = derivedViolations;
  const sanctions = derivedSanctions;
  const strands = strandOptions.length ? strandOptions : [];

  // Determine if user has applied any filter — table remains hidden until true
  const hasAppliedFilters = (() => {
    const f = filters;
    return !!(
      (f.alphabetical && f.alphabetical !== "") ||
      (f.disciplinary && f.disciplinary !== "") ||
      (f.department && f.department !== "") ||
      (f.year && f.year !== "") ||
      (f.section && f.section !== "") ||
      (f.grade && f.grade !== "") ||
      (f.violation && f.violation !== "") ||
      (f.sanction && f.sanction !== "") ||
      (f.status && f.status.length > 0)
    );
  })();

  // Apply filters/sorting to the fetched reports
  const filteredReports = reports
    .filter((r) => (filters.department ? r.department === filters.department : true))
    .filter((r) => (filters.year ? String(r.year) === String(filters.year) : true))
    .filter((r) => (filters.violation ? (r.violation || "") === filters.violation : true))
    .filter((r) => (filters.sanction ? (r.sanction || "") === filters.sanction : true))
    .filter((r) => (filters.grade ? (r.grade || "").toString() === filters.grade.toString() : true))
    .filter((r) => (filters.section ? (r.section || "") === filters.section : true))
    .filter((r) => (filters.status.length > 0 ? filters.status.includes(r.status) : true))
    .sort((a, b) => {
      if (filters.alphabetical === "A-Z") return (a.name || "").localeCompare(b.name || "");
      if (filters.alphabetical === "Z-A") return (b.name || "").localeCompare(a.name || "");
      return 0;
    });

  const handleExport = () => {
    if (!hasAppliedFilters) {
      alert("Apply filters first to export results.");
      return;
    }
    const rows = filteredReports.map((r) => [
      r.student_id || "",
      r.name || "",
      r.department || "",
      r.grade || "",
      r.section || "",
      r.violation || "",
    ]);
    const csvContent = [["Student ID", "Name", "Department", "Grade", "Section", "Violation"], ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "reports_filtered.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // When opening filter, focus first input like StudentIncidentPage
  useEffect(() => {
    if (filterOpen) {
      // small timeout to wait for DOM render
      setTimeout(() => {
        const container = filterContainerRef.current;
        if (!container) return;
        const firstInput = container.querySelector("select, input, button");
        if (firstInput) firstInput.focus();
      }, 50);
    }
  }, [filterOpen]);

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Report Management</h2>
        <div
          className="report-controls"
          style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}
          ref={filterContainerRef}
        >
          <button className="btn primary" onClick={handleExport}>
            <FaFileExport className="icon" /> Export
          </button>

          <button
            className="btn secondary"
            ref={filterBtnRef}
            onClick={() => setFilterOpen((prev) => !prev)}
          >
            <FaFilter className="icon" /> Filter
          </button>

          {/* Filter dropdown placed and styled like StudentIncidentPage */}
          {filterOpen && (
            <div className="filter-dropdown" role="region" aria-label="Filters" style={{
              position: "absolute",
              top: (filterBtnRef.current ? filterBtnRef.current.offsetTop + filterBtnRef.current.offsetHeight + 6 : 40),
              right: 0,
              zIndex: 40,
              minWidth: 320,
              maxWidth: 420,
              background: "#fff",
              borderRadius: 6,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              padding: 12,
              maxHeight: "56vh",
              overflowY: "auto"
            }}>
              <h3 className="filter-title" style={{ marginTop: 0 }}>Filter</h3>

              {/* Alphabetical */}
              <div className="filter-section">
                <label className="filter-section-title">Alphabetical</label>
                <div className="filter-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.alphabetical === "A-Z"}
                      onChange={() => handleFilterChange("alphabetical", filters.alphabetical === "A-Z" ? "" : "A-Z")}
                    />{" "}
                    A → Z
                  </label>
                </div>
                <div className="filter-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.alphabetical === "Z-A"}
                      onChange={() => handleFilterChange("alphabetical", filters.alphabetical === "Z-A" ? "" : "Z-A")}
                    />{" "}
                    Z → A
                  </label>
                </div>
              </div>

              {/* Department */}
              <div className="filter-section">
                <label className="filter-section-title">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => handleFilterChange("department", e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="filter-section">
                <label className="filter-section-title">Section</label>
                <select
                  value={filters.section}
                  onChange={(e) => handleFilterChange("section", e.target.value)}
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Grade */}
              <div className="filter-section">
                <label className="filter-section-title">Grade</label>
                <select
                  value={filters.grade}
                  onChange={(e) => handleFilterChange("grade", e.target.value)}
                >
                  <option value="">All Grades</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Strand */}
              <div className="filter-section">
                <label className="filter-section-title">Strand</label>
                <select
                  value={filters.strand}
                  onChange={(e) => handleFilterChange("strand", e.target.value)}
                >
                  <option value="">All Strands</option>
                  {strands.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Year (radio group like StudentIncidentPage) */}
              <div className="filter-section">
                <label className="filter-section-title">Year Level</label>
                <div className="year-radio-group" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["1st Year", "2nd Year", "3rd Year", "4th Year", ""].map((yr, i) => (
                    <label key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="radio"
                        name="year"
                        value={yr}
                        checked={filters.year === yr}
                        onChange={(e) => handleFilterChange("year", e.target.value)}
                      />{" "}
                      {yr || "All"}
                    </label>
                  ))}
                </div>
              </div>

              {/* Violation */}
              <div className="filter-section">
                <label className="filter-section-title">Violation</label>
                <select
                  value={filters.violation}
                  onChange={(e) => handleFilterChange("violation", e.target.value)}
                >
                  <option value="">All Violations</option>
                  {violations.map((v) => (<option key={v} value={v}>{v}</option>))}
                </select>
              </div>

              {/* Sanction */}
              <div className="filter-section">
                <label className="filter-section-title">Sanction</label>
                <select
                  value={filters.sanction}
                  onChange={(e) => handleFilterChange("sanction", e.target.value)}
                >
                  <option value="">All Sanctions</option>
                  {sanctions.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn" onClick={() => { clearFilters(); setFilterOpen(false); }}>Clear</button>
                <button className="btn primary" onClick={() => setFilterOpen(false)}>Apply</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="report-table-container" style={{ marginTop: 16 }}>
        {loading ? (
          <p>Loading reports...</p>
        ) : (
          <>
            {!hasAppliedFilters ? (
              <div style={{ padding: 24, color: "#444" }}>
                <strong>No data displayed.</strong>
                <div style={{ marginTop: 8 }}>Use the Filter button to select criteria — results will display after applying filters.</div>
              </div>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Grade</th>
                    <th>Section</th>
                    <th>Violation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                      <tr key={report.id} onClick={() => setViewModal({ open: true, item: report })} style={{ cursor: "pointer" }}>
                        <td>{report.student_id || report.id}</td>
                        <td>{report.name || "-"}</td>
                        <td>{report.department || "-"}</td>
                        <td>{report.grade || "-"}</td>
                        <td>{report.section || "-"}</td>
                        <td>{report.violation || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center">No reports found for the selected filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* View Modal */}
      {viewModal.open && (
        <div className="modal-overlay" onClick={() => setViewModal({ open: false, item: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>View Incident</h3>
            <div style={{ marginBottom: 12 }}>
              <div><strong>Student ID:</strong> {viewModal.item.student_id || viewModal.item.id}</div>
              <div><strong>Name:</strong> {viewModal.item.name}</div>
              <div><strong>Department:</strong> {viewModal.item.department || "-"}</div>
              <div><strong>Grade:</strong> {viewModal.item.grade || "-"}</div>
              <div><strong>Section:</strong> {viewModal.item.section || "-"}</div>
              <div><strong>Year:</strong> {viewModal.item.year || "-"}</div>
              <div><strong>Violation:</strong> {viewModal.item.violation || "-"}</div>
              <div><strong>Sanction:</strong> {viewModal.item.sanction || "-"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setViewModal({ open: false, item: null })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;