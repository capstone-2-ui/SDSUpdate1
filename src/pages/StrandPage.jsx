// src/pages/StrandPage.jsx
import React, { useState, useRef, useEffect } from "react";
import "./StrandPage.css";
import { FaEdit, FaTrash, FaUserCircle } from "react-icons/fa";

export default function StrandPage({ user }) {
  const API_URL = "http://localhost/SDSUpdate1-main/backend/Strand.php"; // adjust if needed

  const [strands, setStrands] = useState([]);
  const [filteredStrands, setFilteredStrands] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [formData, setFormData] = useState({ id: null, strand: "", type: "" });
  const [editIndex, setEditIndex] = useState(null);

  // filter modal states
  const [alphabetical, setAlphabetical] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filterRef = useRef(null);

  // ---- FETCH STRANDS ----
  const fetchStrands = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setStrands(data);
      setFilteredStrands(data);
    } catch (error) {
      console.error("Error fetching strands:", error);
    }
  };

  useEffect(() => {
    fetchStrands();
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
        body: JSON.stringify({ strand: formData.strand, type: formData.type }),
      });
      await res.json();
      fetchStrands();
      setFormData({ id: null, strand: "", type: "" });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding strand:", error);
    }
  };

  // ---- EDIT ----
  const handleEdit = async () => {
    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      await res.json();
      fetchStrands();
      setFormData({ id: null, strand: "", type: "" });
      setShowEditModal(false);
    } catch (error) {
      console.error("Error editing strand:", error);
    }
  };

  const openEditModal = (strand) => {
    setFormData(strand);
    setShowEditModal(true);
  };

  // ---- DELETE ----
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this strand?")) {
      try {
        const res = await fetch(`${API_URL}?id=${id}`, {
          method: "DELETE",
        });
        await res.json();
        fetchStrands();
      } catch (error) {
        console.error("Error deleting strand:", error);
      }
    }
  };

  // ---- SEARCH ----
  const handleSearch = (e) => {
    setSearch(e.target.value);
    // filtering handled by reactive effect below
  };

  // ---- REACTIVE FILTERING (applies immediately when any filter/search changes) ----
  useEffect(() => {
    let result = Array.isArray(strands) ? [...strands] : [];

    // Alphabetical sort
    if (alphabetical === "az") {
      result.sort((a, b) => (a.strand || "").localeCompare(b.strand || ""));
    } else if (alphabetical === "za") {
      result.sort((a, b) => (b.strand || "").localeCompare(a.strand || ""));
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((s) => (s.type || "") === typeFilter);
    }

    // Free-text search (strand)
    const q = (search || "").trim().toLowerCase();
    if (q) {
      result = result.filter((s) =>
        ((s.strand || "").toString().toLowerCase()).includes(q)
      );
    }

    setFilteredStrands(result);
  }, [strands, alphabetical, typeFilter, search]);

  // ---- EXPORT ----
  const handleExport = () => {
    const csv = [
      ["Strand", "Type"],
      ...(strands || []).map((s) => [s.strand, s.type]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strands.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- BULK UPLOAD (Simulation) ----
  const handleBulkUpload = () => {
    alert("Bulk Upload feature not yet implemented.");
  };

  // ---- DOWNLOAD TEMPLATE ----
  const handleDownloadTemplate = () => {
    const template = "Strand,Type\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strand_template.csv";
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
        <h1 className="dashboard-title">Strand Management</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* CONTROLS (search + actions; filter dropdown anchored like GradePage) */}
      <div
        className="strand-controls"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={handleSearch}
          style={{ flex: "1 1 360px", maxWidth: 325 }}
        />

        <div
          ref={filterRef}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            className="button-group"
            style={{ display: "inline-flex", gap: 8 }}
          >
            <button
              className="btn primary"
              onClick={() => setShowAddModal(true)}
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
              aria-label="Strand filters"
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

              <label
                style={{ display: "block", marginBottom: 6 }}
                htmlFor="alphabetical-filter"
              >
                Alphabetical
              </label>
              <div
                id="alphabetical-filter"
                style={{ display: "flex", gap: 8, marginBottom: 8 }}
              >
                <label style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={alphabetical === "az"}
                    onChange={() =>
                      setAlphabetical(alphabetical === "az" ? "" : "az")
                    }
                  />{" "}
                  A → Z
                </label>
                <label style={{ fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={alphabetical === "za"}
                    onChange={() =>
                      setAlphabetical(alphabetical === "za" ? "" : "za")
                    }
                  />{" "}
                  Z → A
                </label>
              </div>

              <label style={{ display: "block", marginBottom: 6 }} htmlFor="type-filter">
                Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: "100%", marginBottom: 8 }}
              >
                <option value="">All</option>
                <option value="Academic">Academic</option>
                <option value="Technical-Vocational">Technical-Vocational</option>
              </select>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 6,
                }}
              >
                <button
                  className="btn secondary"
                  onClick={() => setShowFilterModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="strand-table-container">
        <table className="strand-table">
          <thead>
            <tr>
              <th>Strand</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStrands.map((s, i) => (
              <tr key={i}>
                <td>{s.strand}</td>
                <td>{s.type}</td>
                <td>
                  <FaEdit className="icon edit-icon" onClick={() => openEditModal(s)} />
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
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Strand</h3>
            </div>
            <div className="modal-body">
              <label>Strand</label>
              <input
                type="text"
                name="strand"
                value={formData.strand}
                onChange={handleInputChange}
                placeholder="Enter Strand"
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
              <button className="btn cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn add" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Strand</h3>
            </div>
            <div className="modal-body">
              <label>Strand</label>
              <input
                type="text"
                name="strand"
                value={formData.strand}
                onChange={handleInputChange}
                placeholder="Enter Strand"
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
              <button className="btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn add" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
