// src/pages/SanctionPage.jsx
import React, { useState, useRef, useEffect } from "react";
import "./SanctionPage.css";
import { FaEdit, FaTrash, FaUserCircle } from "react-icons/fa";

export default function SanctionPage({ user }) {
  const [sanctions, setSanctions] = useState([]);
  const [filteredSanctions, setFilteredSanctions] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [formData, setFormData] = useState({ id: null, sanction: "", type: "", offense: "", severity: "" });
  const [editIndex, setEditIndex] = useState(null);

  // filter modal states
  const [alphabetical, setAlphabetical] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [offenseFilter, setOffenseFilter] = useState("");

  const filterRef = useRef(null);
  const fileInputRef = useRef(null);
  const timeoutRef = useRef(null);
  const API_URL = "http://192.168.0.111/SDSUpdate1-main/backend/Sanction.php"; // <-- adjust if needed

  // Confirmation (top-right green toast)
  const [confirmation, setConfirmation] = useState({ visible: false, message: "" });
  const showConfirmation = (message, duration = 3000) => {
    // clear any existing hide timers
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

  // ---- FETCH ALL SANCTIONS ----
  const fetchSanctions = async () => {
    try {
      const res = await fetch(`${API_URL}?action=read`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      const data = await res.json();
      setSanctions(data);
      setFilteredSanctions(data);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Failed to fetch sanctions. Make sure the backend (Sanction.php) is running and accessible.");
    }
  };

  useEffect(() => {
    fetchSanctions();
    // cleanup on unmount
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
      const res = await fetch(`${API_URL}?action=create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.status && data.status === "error") {
        throw new Error(data.message || "Server error");
      }
      fetchSanctions();
      setFormData({ sanction: "", type: "", offense: "", severity: "" });
      setShowAddModal(false);
      showConfirmation("Sanction added successfully");
    } catch (err) {
      console.error("Add error:", err);
      alert("Failed to add sanction. See console for details.");
    }
  };

  // ---- EDIT ----
  const handleEdit = async () => {
    try {
      const res = await fetch(`${API_URL}?action=update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.status && data.status === "error") {
        throw new Error(data.message || "Server error");
      }
      fetchSanctions();
      setFormData({ sanction: "", type: "", offense: "", severity: "" });
      setShowEditModal(false);
      showConfirmation("Changes saved");
    } catch (err) {
      console.error("Edit error:", err);
      alert("Failed to save changes. See console for details.");
    }
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    setFormData(filteredSanctions[index]); // get selected row
    setShowEditModal(true);
  };

  // ---- DELETE ----
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sanction?")) return;
    try {
      const res = await fetch(`${API_URL}?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.status && data.status === "error") {
        throw new Error(data.message || "Server error");
      }
      fetchSanctions();
      showConfirmation("Sanction deleted");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete sanction. See console for details.");
    }
  };

  // ---- SEARCH (simplified) ----
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // ---- REACTIVE FILTERING (applies immediately when any filter/search changes) ----
  useEffect(() => {
    let result = Array.isArray(sanctions) ? [...sanctions] : [];

    // Alphabetical sort
    if (alphabetical === "az") {
      result.sort((a, b) => (a.sanction || "").localeCompare(b.sanction || ""));
    } else if (alphabetical === "za") {
      result.sort((a, b) => (b.sanction || "").localeCompare(a.sanction || ""));
    }

    // Category
    if (categoryFilter) {
      result = result.filter((s) => (s.type || "") === categoryFilter);
    }

    // Offense
    if (offenseFilter) {
      result = result.filter((s) => (s.offense || "") === offenseFilter);
    }

    // Severity
    if (severityFilter) {
      result = result.filter((s) => (s.severity || "") === severityFilter);
    }

    // Free-text search (sanction name)
    const q = (search || "").trim().toLowerCase();
    if (q) {
      result = result.filter((s) =>
        (s.sanction || "").toString().toLowerCase().includes(q)
      );
    }

    setFilteredSanctions(result);
  }, [sanctions, alphabetical, categoryFilter, offenseFilter, severityFilter, search]);

  // ---- FILTER ----
  const applyFilter = () => {
    let result = [...sanctions];

    if (alphabetical === "az") {
      result.sort((a, b) => a.sanction.localeCompare(b.sanction));
    } else if (alphabetical === "za") {
      result.sort((a, b) => b.sanction.localeCompare(a.sanction));
    }

    if (categoryFilter) {
      result = result.filter((s) => s.type === categoryFilter);
    }

    if (severityFilter) {
      result = result.filter((s) => s.severity === severityFilter);
    }

    if (offenseFilter) {
      result = result.filter((s) => s.offense === offenseFilter);
    }

    setFilteredSanctions(result);
    setShowFilterModal(false);
  };

  // ---- EXPORT ----
  const handleExport = () => {
    const csv = [
      ["Sanction", "Category", "Offense Level", "Severity"],
      ...sanctions.map((s) => [s.sanction, s.type, s.offense, s.severity]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sanctions.csv";
    a.click();
    URL.revokeObjectURL(url);
    showConfirmation("Export started");
  };

  // ---- DOWNLOAD TEMPLATE ----
  const handleDownloadTemplate = () => {
    const template = "Sanction,Category,Offense Level,Severity\nExample,Minor,1st,Low";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sanction_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    showConfirmation("Template downloaded");
  };

  // ---- BULK UPLOAD ----
  const handleBulkUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split("\n").slice(1); // skip header
      const sanctionsData = rows
        .map((row) => row.split(","))
        .filter((cols) => cols.length >= 4 && cols[0].trim() !== "")
        .map((cols) => ({
          sanction: cols[0].trim(),
          type: cols[1].trim(),
          offense: cols[2].trim(),
          severity: cols[3].trim(),
        }));

      try {
        const res = await fetch(`${API_URL}?action=bulkUpload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sanctionsData),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server returned ${res.status}: ${text}`);
        }
        const data = await res.json();
        if (data.status && data.status === "error") {
          throw new Error(data.message || "Bulk upload error");
        }
        fetchSanctions();
        showConfirmation("Bulk upload successful!");
      } catch (err) {
        console.error("Bulk upload error:", err);
        alert("Failed to upload CSV. See console for details.");
      }
    };
    reader.readAsText(file);
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
            background: "#0f9d58", // Google-style green
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
        <h1 className="dashboard-title">Sanction Management</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* CONTROLS (search + actions; filter dropdown anchored) */}
      <div className="sanction-controls" style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <button className="btn primary" onClick={() => setShowAddModal(true)}>+ Add</button>
            <button className="btn secondary" onClick={handleBulkUploadClick}>Bulk Upload</button>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleBulkUpload}
            />
            <button className="btn secondary" onClick={handleExport}>Export</button>
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
              aria-label="Sanction filters"
              style={{
                position: "absolute",
                top: "calc(100% + 8px)", // appears directly below the wrapper (Filter button)
                right: 0,
                zIndex: 200,
                minWidth: 280,
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
                  <input type="checkbox" checked={alphabetical === "az"} onChange={() => setAlphabetical(alphabetical === "az" ? "" : "az")} /> A → Z
                </label>
                <label style={{ fontWeight: 400 }}>
                  <input type="checkbox" checked={alphabetical === "za"} onChange={() => setAlphabetical(alphabetical === "za" ? "" : "za")} /> Z → A
                </label>
              </div>

              <label style={{ display: "block", marginBottom: 6 }}>Type</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ width: "100%", marginBottom: 8 }}>
                <option value="">All</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>

              <label style={{ display: "block", marginBottom: 6 }}>Offense Level</label>
              <select value={offenseFilter} onChange={(e) => setOffenseFilter(e.target.value)} style={{ width: "100%", marginBottom: 8 }}>
                <option value="">All</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
              </select>

              <label style={{ display: "block", marginBottom: 6 }}>Severity Level</label>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ width: "100%", marginBottom: 8 }}>
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
                <button className="btn secondary" onClick={() => setShowFilterModal(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="sanction-table-container">
        <table className="sanction-table">
          <thead>
            <tr>
              <th>Sanction</th>
              <th>Type</th>
              <th>Offense Level</th>
              <th>Severity Level</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSanctions.map((s, i) => (
              <tr key={s.id}>
                <td>{s.sanction}</td>
                <td>{s.type}</td>
                <td>{s.offense}</td>
                <td>{s.severity}</td>
                <td>
                  <FaEdit className="icon edit-icon" onClick={() => openEditModal(i)} />
                  <FaTrash className="icon delete-icon" onClick={() => handleDelete(s.id)} />
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
          <div className="custom-modal">
            <div className="modal-header">Add Sanction</div>
            <div className="modal-body">
              <label>Sanction</label>
              <input type="text" name="sanction" value={formData.sanction} onChange={handleInputChange} />
              <label>Types</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="">Select Type</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
              <label>Offense Level</label>
              <select name="offense" value={formData.offense} onChange={handleInputChange}>
                <option value="">Select Offense</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
              </select>
              <label>Severity Level</label>
              <select name="severity" value={formData.severity} onChange={handleInputChange}>
                <option value="">Select Severity</option>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn confirm" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="custom-modal">
            <div className="modal-header">Edit Sanction</div>
            <div className="modal-body">
              <label>Sanction</label>
              <input type="text" name="sanction" value={formData.sanction} onChange={handleInputChange} />
              <label>Category</label>
              <select name="type" value={formData.type} onChange={handleInputChange}>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
              <label>Offense Level</label>
              <select name="offense" value={formData.offense} onChange={handleInputChange}>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
              </select>
              <label>Severity Level</label>
              <select name="severity" value={formData.severity} onChange={handleInputChange}>
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn confirm" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
