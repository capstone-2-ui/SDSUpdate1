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

  const [formData, setFormData] = useState({ id: null, department: "", type: "Student" });
  const [editId, setEditId] = useState(null);

  // filter modal states
  const [alphabetical, setAlphabetical] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filterRef = useRef(null);
  const timeoutRef = useRef(null);

  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ total: 0, success: 0, failed: 0 });
  const [uploadErrors, setUploadErrors] = useState([]);

  const API_URL = "http://192.168.100.88/SDSUpdate1-main/backend/Department.php"; // adjust path if needed

  // Confirmation (top-right green toast)
  const [confirmation, setConfirmation] = useState({ visible: false, message: "" });
  const showConfirmation = (message, duration = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setConfirmation({ visible: true, message });
    timeoutRef.current = setTimeout(() => {
      setConfirmation({ visible: false, message: "" });
      timeoutRef.current = null;
    }, duration);
  };
  const hideConfirmation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setConfirmation({ visible: false, message: "" });
  };

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
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
      // reset form and default type back to Student
      setFormData({ department: "", type: "Student" });
      setShowAddModal(false);
      showConfirmation("Department added successfully");
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
      // reset form and default type back to Student
      setFormData({ department: "", type: "Student" });
      setEditId(null);
      setShowEditModal(false);
      showConfirmation("Changes saved");
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
        showConfirmation("Department deleted");
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
    showConfirmation("Export started");
  };

  // ---- BULK UPLOAD (functional) ----
  // Clicking the Bulk Upload button will open a file picker.
  // The CSV must have at least a header row. Header names are case-insensitive and
  // can be "Department" and "Type" (or columns 0 and 1 will be used).
  const handleBulkUpload = () => {
    // trigger file input
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    } else {
      showConfirmation("File input not available.");
    }
  };

  const parseCSVText = (text) => {
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }
    const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== "");
    if (lines.length === 0) return { rows: [], error: "CSV is empty" };

    // Use first line as header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const deptIdx = header.findIndex((h) => h === "department") >= 0 ? header.findIndex((h) => h === "department") : 0;
    const typeIdx = header.findIndex((h) => h === "type") >= 0 ? header.findIndex((h) => h === "type") : 1;

    const rows = [];
    // start from 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      // if the line is empty skip
      if (cols.length === 0 || cols.every((c) => c === "")) continue;
      const department = cols[deptIdx] || "";
      const type = cols[typeIdx] || "";
      rows.push({ department, type, line: i + 1 });
    }
    return { rows };
  };

  const uploadRowsSequential = async (rows) => {
    setUploading(true);
    setUploadProgress({ total: rows.length, success: 0, failed: 0 });
    setUploadErrors([]);

    const errors = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // basic validation: department required
      if (!r.department || r.department.trim() === "") {
        failed++;
        errors.push({ line: r.line, message: "Missing department name" });
        setUploadProgress((p) => ({ ...p, success, failed }));
        continue;
      }

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department: r.department.trim(), type: r.type.trim() }),
        });
        // attempt to parse response (some backends may return JSON)
        const text = await res.text();
        // if response contains error or non-200 status treat as failure
        if (!res.ok) {
          failed++;
          errors.push({ line: r.line, message: `Server error: ${text || res.statusText}` });
        } else {
          // try parse JSON to detect backend-reported errors
          try {
            const json = text ? JSON.parse(text) : null;
            // If backend returns an object with error property treat as failure
            if (json && (json.error || json.success === false)) {
              failed++;
              errors.push({ line: r.line, message: json.error || JSON.stringify(json) });
            } else {
              success++;
            }
          } catch {
            // not JSON, assume success if ok
            success++;
          }
        }
      } catch (err) {
        failed++;
        errors.push({ line: r.line, message: err.message || "Network error" });
      }
      setUploadProgress({ total: rows.length, success, failed });
    }

    setUploadErrors(errors);
    setUploading(false);
    setUploadProgress({ total: rows.length, success, failed });

    // refresh departments
    await fetchDepartments();

    return { success, failed, errors };
  };

  const onFileSelected = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showConfirmation("Please select a CSV file");
      return;
    }

    try {
      const text = await file.text();
      const { rows, error } = parseCSVText(text);
      if (error) {
        showConfirmation(error);
        return;
      }
      if (!rows || rows.length === 0) {
        showConfirmation("CSV contains no data rows");
        return;
      }

      // confirmation before uploading many rows
      const proceed = window.confirm(`Upload ${rows.length} rows? This will create departments for each row.`);
      if (!proceed) return;

      const result = await uploadRowsSequential(rows);

      // summary notification
      const message = `Bulk upload finished: ${result.success} added, ${result.failed} failed`;
      showConfirmation(message, 5000);
    } catch (err) {
      console.error("Bulk upload failed:", err);
      showConfirmation("Bulk upload failed. See console for details.");
      setUploading(false);
    } finally {
      // clear file input
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
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
    showConfirmation("Template downloaded");
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
      {/* Confirmation toast (top-right) */}
      {confirmation.visible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
            background: "#0f9d58",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 220,
            maxWidth: 360,
          }}
        >
          <span style={{ fontSize: 18 }}>✅</span>
          <div style={{ flex: 1, fontSize: 14 }}>{confirmation.message}</div>
          <button
            onClick={hideConfirmation}
            aria-label="Close confirmation"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.9)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

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
            <button
              className="btn primary"
              onClick={() => {
                // ensure default type is Student when opening Add modal
                setFormData({ department: "", type: "Student" });
                setShowAddModal(true);
              }}
            >
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

      {/* Hidden file input for bulk upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: "none" }}
        onChange={onFileSelected}
        aria-hidden={true}
      />

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

      {/* Upload progress modal */}
      {uploading && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Uploading...</h3>
            </div>
            <div className="modal-body">
              <p>Uploading {uploadProgress.total} rows</p>
              <p>
                Success: {uploadProgress.success} | Failed: {uploadProgress.failed}
              </p>
              <div style={{ marginTop: 8 }}>
                <progress value={uploadProgress.success + uploadProgress.failed} max={Math.max(1, uploadProgress.total)} style={{ width: "100%" }} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn cancel" onClick={() => { /* do nothing: cannot cancel sequential upload currently */ }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If upload finished but errors exist, show a modal with errors */}
      {!uploading && uploadProgress.total > 0 && uploadErrors.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Upload Results</h3>
            </div>
            <div className="modal-body" style={{ maxHeight: "40vh", overflow: "auto" }}>
              <p>
                Uploaded: {uploadProgress.success} / {uploadProgress.total} — Failed: {uploadProgress.failed}
              </p>
              <ul style={{ paddingLeft: 18 }}>
                {uploadErrors.slice(0, 50).map((err, idx) => (
                  <li key={idx}>Line {err.line}: {err.message}</li>
                ))}
              </ul>
              {uploadErrors.length > 50 && <p>...and {uploadErrors.length - 50} more errors</p>}
            </div>
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => {
                  setUploadProgress({ total: 0, success: 0, failed: 0 });
                  setUploadErrors([]);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* changed text input to select with Student default */}
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
              </select>
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
              {/* changed text input to select for editing as well */}
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
              </select>
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
