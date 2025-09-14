import React, { useState, useRef, useEffect } from "react";
import "./SectionPage.css";
import { FaEdit, FaTrash, FaUserCircle } from "react-icons/fa";

export default function SectionPage({ user }) {
  const [sections, setSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [formData, setFormData] = useState({ section: "", type: "" });
  const [editId, setEditId] = useState(null);

  // filter modal states
  const [alphabetical, setAlphabetical] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filterRef = useRef(null);
  const API_URL = "http://localhost/SDSUpdate1-main/backend/Section.php"; // adjust path

  // ---- FETCH DATA ----
  const fetchSections = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setSections(data);
      setFilteredSections(data);
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // ---- HANDLE INPUT ----
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---- ADD ----
  const handleAdd = async () => {
    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      fetchSections();
      setFormData({ section: "", type: "" });
      setShowAddModal(false);
    } catch (err) {
      console.error("Error adding section:", err);
    }
  };

  // ---- EDIT ----
  const handleEdit = async () => {
    try {
      await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, ...formData }),
      });
      fetchSections();
      setFormData({ section: "", type: "" });
      setEditId(null);
      setShowEditModal(false);
    } catch (err) {
      console.error("Error editing section:", err);
    }
  };

  const openEditModal = (section) => {
    setEditId(section.id);
    setFormData({ section: section.section, type: section.type });
    setShowEditModal(true);
  };

  // ---- DELETE ----
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this section?")) {
      try {
        await fetch(API_URL, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        fetchSections();
      } catch (err) {
        console.error("Error deleting section:", err);
      }
    }
  };

  // ---- SEARCH ----
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  // ---- FILTERING: Immediately apply filters when any relevant state changes ----
  useEffect(() => {
    let result = Array.isArray(sections) ? [...sections] : [];

    // Alphabetical sorting
    if (alphabetical === "az") {
      result.sort((a, b) => (a.section || "").localeCompare(b.section || ""));
    } else if (alphabetical === "za") {
      result.sort((a, b) => (b.section || "").localeCompare(a.section || ""));
    }

    // Type filter
    if (typeFilter) {
      result = result.filter((s) => (s.type || "") === typeFilter);
    }

    // Search filter (case-insensitive)
    const q = (search || "").trim().toLowerCase();
    if (q) {
      result = result.filter((s) =>
        ((s.section || "").toString().toLowerCase()).includes(q)
      );
    }

    setFilteredSections(result);
  }, [sections, alphabetical, typeFilter, search]);

  // ---- EXPORT ----
  const handleExport = () => {
    const csv = [
      ["Section", "Type"],
      ...sections.map((s) => [s.section, s.type]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sections.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- BULK UPLOAD (Simulation) ----
  const handleBulkUpload = () => {
    alert("Bulk Upload feature not yet implemented.");
  };

  // ---- DOWNLOAD TEMPLATE ----
  const handleDownloadTemplate = () => {
    const template = "Section,Type\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "section_template.csv";
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
        <h1 className="dashboard-title">Section Management</h1>
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
        className="section-controls"
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
              aria-label="Section filters"
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
                <option value="Student">Student</option>
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
      <div className="section-table-container">
        <table className="section-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSections.map((s) => (
              <tr key={s.id}>
                <td>{s.section}</td>
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
              <h3>Add Section</h3>
            </div>
            <div className="modal-body">
              <label>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleInputChange}
                placeholder="Enter Section"
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
              <h3>Edit Section</h3>
            </div>
            <div className="modal-body">
              <label>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleInputChange}
                placeholder="Enter Section"
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
