import React, { useState, useRef, useEffect } from "react";
import "./DepartmentPage.css";
import { FaEdit, FaTrash, FaUserCircle } from "react-icons/fa";

export default function DepartmentPage({ user }) {
  const [departments, setDepartments] = useState([]);
  const [filteredDepartments, setFilteredDepartments] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [formData, setFormData] = useState({ id: null, department: "", type: "" });
  const [editId, setEditId] = useState(null);

  // filter modal states
  const [alphabetical, setAlphabetical] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filterRef = useRef(null);

  const API_URL = "http://localhost/SDSUpdate1-main/backend/Department.php"; // adjust path if needed

  // ---- FETCH ALL ----
  const fetchDepartments = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setDepartments(data);
      setFilteredDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // ---- HANDLE INPUT ----
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---- ADD ----
  const handleAdd = async () => {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: formData.department, type: formData.type }),
      });
      await res.json();
      fetchDepartments();
      setFormData({ department: "", type: "" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding department:", err);
    }
  };

  // ---- EDIT ----
  const handleEdit = async () => {
    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          department: formData.department,
          type: formData.type,
        }),
      });
      await res.json();
      fetchDepartments();
      setFormData({ department: "", type: "" });
      setEditId(null);
      setShowEditModal(false);
    } catch (err) {
      console.error("Error editing department:", err);
    }
  };

  const openEditModal = (d) => {
    setEditId(d.id);
    setFormData({ department: d.department, type: d.type });
    setShowEditModal(true);
  };

  // ---- DELETE ----
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this department?")) {
      try {
        const res = await fetch(API_URL, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await res.json();
        fetchDepartments();
      } catch (err) {
        console.error("Error deleting department:", err);
      }
    }
  };

  // ---- SEARCH (simplified) ----
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // ---- REACTIVE FILTERING (applies immediately when filters/search change) ----
  useEffect(() => {
    let result = Array.isArray(departments) ? [...departments] : [];

    // Alphabetical sort
    if (alphabetical === "az") {
      result.sort((a, b) => (a.department || "").localeCompare(b.department || ""));
    } else if (alphabetical === "za") {
      result.sort((a, b) => (b.department || "").localeCompare(a.department || ""));
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((d) => (d.type || "") === typeFilter);
    }

    // Free-text search (department name)
    const q = (search || "").trim().toLowerCase();
    if (q) {
      result = result.filter((d) =>
        ((d.department || "").toString().toLowerCase()).includes(q)
      );
    }

    setFilteredDepartments(result);
  }, [departments, alphabetical, typeFilter, search]);

  // ---- EXPORT ----
  const handleExport = () => {
    const csv = [
      ["Department", "Type"],
      ...departments.map((d) => [d.department, d.type]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "departments.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- BULK UPLOAD (Simulation) ----
  const handleBulkUpload = () => {
    alert("Bulk Upload feature not yet implemented.");
  };

  // ---- DOWNLOAD TEMPLATE ----
  const handleDownloadTemplate = () => {
    const template = "Department,Type\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "department_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- CLOSE FILTER ON OUTSIDE CLICK ----
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterModal(false);
      }
    };

    if (showFilterModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilterModal]);

  return (
    <div className="dashboard-container">
      {/* Header (Dashboard design) */}
      <div className="dashboard-header-bar">
        <h1 className="dashboard-title">Department Management</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* CONTROLS (search + actions; filter dropdown anchored) */}
      <div className="department-controls" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={handleSearch}
          style={{ flex: "1 1 360px", maxWidth: 325 }}
        />

        <div ref={filterRef} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <div className="button-group" style={{ display: "inline-flex", gap: 8 }}>
            <button className="btn primary" onClick={() => setShowAddModal(true)}>
              + Add
            </button>
            <button className="btn secondary" onClick={handleBulkUpload}>
              Bulk Upload
            </button>
            <button className="btn secondary" onClick={handleExport}>
              Export
            </button>
            <button
              className="btn secondary"
              onClick={() => setShowFilterModal((s) => !s)}
              aria-haspopup="true"
              aria-expanded={showFilterModal}
            >
              Filter
            </button>
          </div>

          {/* Filter dropdown anchored to this wrapper, appears below the Filter button */}
          {showFilterModal && (
            <div
              className="filter-dropdown"
              role="dialog"
              aria-label="Department filters"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                zIndex: 200,
                minWidth: 260,
                maxWidth: 420,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                padding: 12,
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Filter</h3>

              <label style={{ display: "block", marginBottom: 6 }}>Alphabetical</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <label style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={alphabetical === "az"}
                    onChange={() => setAlphabetical(alphabetical === "az" ? "" : "az")}
                  />{" "}
                  A → Z
                </label>
                <label style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={alphabetical === "za"}
                    onChange={() => setAlphabetical(alphabetical === "za" ? "" : "za")}
                  />{" "}
                  Z → A
                </label>
              </div>

              <label style={{ display: "block", marginBottom: 6 }}>Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: "100%", marginBottom: 8 }}
              >
                <option value="">All</option>
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
              </select>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button className="btn secondary" onClick={() => setShowFilterModal(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="department-table-container">
        <table className="department-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.map((d) => (
              <tr key={d.id}>
                <td>{d.department}</td>
                <td>{d.type}</td>
                <td>
                  <FaEdit
                    className="icon edit-icon"
                    onClick={() => openEditModal(d)}
                  />
                  <FaTrash
                    className="icon delete-icon"
                    onClick={() => handleDelete(d.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="download-template">
        <button className="btn download" onClick={handleDownloadTemplate}>
          Download Template
        </button>
      </div>

      {/* ---- ADD MODAL ---- */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Department</h3>
            </div>
            <div className="modal-body">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Enter Department"
              />
              <label>Type</label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Enter Type"
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button className="btn add" onClick={handleAdd}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Department</h3>
            </div>
            <div className="modal-body">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Enter Department"
              />
              <label>Type</label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Enter Type"
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button className="btn add" onClick={handleEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
