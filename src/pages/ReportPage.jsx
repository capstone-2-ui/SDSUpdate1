// src/pages/ReportPage.jsx
import React, { useState, useEffect } from "react";
import { FaFileExport, FaFilter } from "react-icons/fa";
import "./ReportPage.css";

const ReportPage = () => {
  const [filters, setFilters] = useState({
    alphabetical: "",
    disciplinary: "",
    department: "",
    year: "",
    section: "",
    grade: "",
    violation: "",
    status: [],
  });

  const [showFilter, setShowFilter] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch reports from backend (studentincident.php or report.php)
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("http://localhost/student_discipline_backend/report.php");
        const data = await res.json();
        if (data.ok) {
          setReports(data.data);
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value) => {
    setFilters((prev) => {
      const updatedStatus = prev.status.includes(value)
        ? prev.status.filter((s) => s !== value)
        : [...prev.status, value];
      return { ...prev, status: updatedStatus };
    });
  };

  // ✅ Apply filters and sorting
  const filteredReports = reports
    .filter((r) => (filters.department ? r.department === filters.department : true))
    .filter((r) => (filters.year ? r.year === filters.year : true))
    .filter((r) => (filters.violation ? r.violation === filters.violation : true))
    .filter((r) => (filters.status.length > 0 ? filters.status.includes(r.status) : true))
    .sort((a, b) => {
      if (filters.alphabetical === "A-Z") return a.student.localeCompare(b.student);
      if (filters.alphabetical === "Z-A") return b.student.localeCompare(a.student);
      return 0;
    });

  const handleExport = () => {
    const csvContent = [
      ["Student", "Violation", "Department", "Year", "Status"],
      ...filteredReports.map((r) => [r.student, r.violation, r.department, r.year, r.status]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Report Management</h2>
        <div className="report-controls">
          <button className="btn primary" onClick={handleExport}>
            <FaFileExport className="icon" /> Export
          </button>
          <button className="btn secondary" onClick={() => setShowFilter(!showFilter)}>
            <FaFilter className="icon" /> Filter
          </button>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilter && (
        <div className="filter-dropdown">
          <div className="filter-modal">
            <h3>Filter</h3>
            {/* Same filter controls as before */}
            {/* ... keep your filter inputs here ... */}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="report-table-container">
        {loading ? (
          <p>Loading reports...</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Violation</th>
                <th>Department</th>
                <th>Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.student || report.student_id}</td>
                    <td>{report.violation || report.description}</td>
                    <td>{report.department || "-"}</td>
                    <td>{report.year || "-"}</td>
                    <td>{report.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReportPage;