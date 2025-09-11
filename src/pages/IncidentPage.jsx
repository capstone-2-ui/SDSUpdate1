import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./IncidentPage.css";

function IncidentPage() {
  const API_BASE = "http://localhost/SDSUpdate1-main/backend/Incident.php";

  // Sample Students
  const [students] = useState([
    { id: "01", name: "John Doe", dept: "BSIT", year: "III", section: "" },
    { id: "02", name: "Jane Smith", dept: "BSED", year: "II", section: "A" },
  ]);

  const location = useLocation();

  // State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [violations, setViolations] = useState([]); // incidents list
  const [violationOptions, setViolationOptions] = useState([]); // backend violations for selected Type
  const [sanctionOptions, setSanctionOptions] = useState([]); // backend sanctions for selected Type

  const [formData, setFormData] = useState({
    type: "",
    sanction: "",
    violation: "",
    offense: "1st",
  });

  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  // modal: { open, title, content, pos: {left, top} | null, noHeader }
  const [modal, setModal] = useState({ open: false, title: "", content: null, pos: null, noHeader: false });

  // Major workflow tracking (existing)
  const [majorSteps, setMajorSteps] = useState({});
  const [majorData, setMajorData] = useState({});

  const exportBtnRef = useRef(null);

  // If navigated with a student in location.state, set it as selected
  useEffect(() => {
    if (location?.state?.student) {
      setSelectedStudent(location.state.student);
    }
  }, [location]);

  // Fetch incidents from backend on mount
  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (Array.isArray(data)) {
        setViolations(data);
      } else if (Array.isArray(data.incidents)) {
        setViolations(data.incidents);
      } else {
        setViolations([]);
      }
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
    }
  };

  // Create incident (POST)
  const createIncident = async (payload) => {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        const newItem = { id: data.id, ...payload };
        setViolations((prev) => [newItem, ...prev]);
        return { success: true, item: newItem };
      } else {
        console.error("Create error:", data);
        return { success: false, message: data?.message || "Create failed" };
      }
    } catch (err) {
      console.error("Create failed:", err);
      return { success: false, message: err.message };
    }
  };

  // Update incident (PUT)
  const updateIncident = async (payload) => {
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setViolations((prev) => prev.map((p) => (String(p.id) === String(payload.id) ? { ...p, ...payload } : p)));
        return { success: true };
      } else {
        console.error("Update error:", data);
        return { success: false, message: data?.message || "Update failed" };
      }
    } catch (err) {
      console.error("Update failed:", err);
      return { success: false, message: err.message };
    }
  };

  // Delete incident (DELETE)
  const deleteIncident = async (id) => {
    try {
      const res = await fetch(API_BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setViolations((prev) => prev.filter((v) => String(v.id) !== String(id)));
        return { success: true };
      } else {
        console.error("Delete error:", data);
        return { success: false, message: data?.message || "Delete failed" };
      }
    } catch (err) {
      console.error("Delete failed:", err);
      return { success: false, message: err.message };
    }
  };

  // Bulk Upload
  const handleBulkUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      alert(`File "${file.name}" uploaded! (Processing logic here)`);
    }
  };

  // Export Table Data
  const handleExport = () => {
    const headers = ["ID", "Name", "Department", "Year", "Section", "Violation"];
    const rows = violations.map((v) => [
      v.id,
      v.name,
      v.department || v.dept,
      v.year,
      v.section,
      v.violation,
    ]);
    const tableData = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([tableData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident_records.csv";
    a.click();
  };

  // Download Template
  const handleDownloadTemplate = () => {
    const csv = "ID,Name,Dept.,Year,Section,Violation\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident_template.csv";
    a.click();
  };

  // Configure student
  const handleConfigure = (student) => {
    setSelectedStudent(student);
  };

  // Form change - also fetch options when Type changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // When the user selects the type, fetch both violations and sanctions from backend
    if (name === "type") {
      setViolationOptions([]);
      setSanctionOptions([]);
      if (!value) return;

      const urlBoth = `${API_BASE}?type=${encodeURIComponent(value)}`;

      fetch(urlBoth)
        .then((res) => res.json())
        .then((data) => {
          // If backend returned object { violations: [...], sanctions: [...] }
          if (data && typeof data === "object" && !Array.isArray(data)) {
            setViolationOptions(Array.isArray(data.violations) ? data.violations : []);
            setSanctionOptions(Array.isArray(data.sanctions) ? data.sanctions : []);
            setFormData((prev) => ({
              ...prev,
              violation: (data.violations && data.violations[0]?.name) || "",
              sanction: (data.sanctions && data.sanctions[0]?.name) || "",
            }));
            return;
          }

          // If backend returned a single array (compatibility), assume it's violations
          if (Array.isArray(data)) {
            setViolationOptions(data);
            setSanctionOptions([]);
            setFormData((prev) => ({ ...prev, violation: data[0]?.name || "", sanction: "" }));
            return;
          }

          // fallback - keep empty arrays
          setViolationOptions([]);
          setSanctionOptions([]);
        })
        .catch((err) => {
          console.error("Failed to load type options:", err);
          setViolationOptions([]);
          setSanctionOptions([]);
        });
    }
  };

  // Add violation - persist to backend
  const handleAddViolation = async () => {
    if (!selectedStudent) {
      alert("Select a student first!");
      return;
    }

    const payload = {
      student_id: selectedStudent.id,
      name: selectedStudent.name,
      department: selectedStudent.department || selectedStudent.dept || "",
      year: selectedStudent.year,
      section: selectedStudent.section,
      type: formData.type,
      offense: formData.offense,
      violation: formData.violation,
      sanction: formData.sanction,
    };

    const result = await createIncident(payload);
    if (result.success) {
      setFormData({ type: "", sanction: "", violation: "", offense: "1st" });
      setSelectedStudent(null);
    } else {
      alert("Failed to save incident: " + (result.message || "unknown"));
    }
  };

  // Action Menu Handler (used when a menu item is clicked inside the popover)
  const handleMenuAction = (action, student) => {
    // student here is the incident row object
    switch (action) {
      case "View Student Profile": {
        const content = (
          <div className="modal-inner-content">
            <h3>{student.name}</h3>
            <p><b>ID:</b> {student.student_id ?? student.id}</p>
            <p><b>Department:</b> {student.department || student.dept}</p>
            <p><b>Year:</b> {student.year}</p>
            <p><b>Section:</b> {student.section}</p>
            <p><b>Violation:</b> {student.violation}</p>
          </div>
        );
        setModal({ open: true, title: action, content, pos: null, noHeader: false });
        break;
      }

      case "Edit Violation": {
        const initial = {
          id: student.id,
          student_id: student.student_id || student.studentId || student.id,
          name: student.name,
          department: student.department || student.dept || "",
          year: student.year || "",
          section: student.section || "",
          type: student.type || "",
          offense: student.offense || "1st",
          violation: student.violation || "",
          sanction: student.sanction || "",
        };

        setModal({
          open: true,
          title: "Edit Violation",
          pos: null,
          noHeader: false,
          content: (
            <EditIncidentForm
              initial={initial}
              onSave={async (updated) => {
                const res = await updateIncident(updated);
                if (res.success) setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
                else alert("Update failed: " + (res.message || ""));
              }}
              onCancel={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
            />
          ),
        });
        break;
      }

      case "Delete": {
        setModal({
          open: true,
          title: "Confirm Delete",
          pos: null,
          noHeader: false,
          content: (
            <div style={{ padding: 12 }}>
              <p>Delete incident for <strong>{student.name}</strong> (ID: {student.id})?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  const res = await deleteIncident(student.id);
                  if (res.success) setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
                  else alert("Delete failed: " + (res.message || ""));
                }}>Delete</button>
                <button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>Cancel</button>
              </div>
            </div>
          ),
        });
        break;
      }

      case "Process": {
        // use MajorOffenseModal; hide the redundant outer header
        const lastSaved = majorSteps[student.id] || 0;
        if ((student.type || student.violation || "").toLowerCase() !== "major" && (formData.type !== "Major")) {
          if (!lastSaved) {
            setModal({ open: true, title: action, content: <p>Please set the violation type to <b>Major</b> first to start the process.</p>, pos: null, noHeader: false });
            break;
          }
        }
        if (lastSaved >= 5) {
          setModal({ open: true, title: action, content: <p>All steps are already completed for {student.name}.</p>, pos: null, noHeader: false });
          break;
        }
        const nextStep = Math.min(lastSaved + 1, 5);
        setModal({
          open: true,
          title: action,
          pos: null,
          noHeader: true,
          content: (
            <MajorOffenseModal
              step={nextStep}
              student={student}
              savedData={(majorData[student.id] || {})[`step${nextStep}`]}
              onSave={(stepNumber, dataObj) => {
                setMajorData((prev) => {
                  const prevForStudent = prev[student.id] || {};
                  return {
                    ...prev,
                    [student.id]: {
                      ...prevForStudent,
                      [`step${stepNumber}`]: dataObj,
                    },
                  };
                });
                setMajorSteps((prev) => ({
                  ...prev,
                  [student.id]: Math.max(prev[student.id] || 0, stepNumber),
                }));
                setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
              }}
              onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
            />
          ),
        });
        break;
      }

      case "Send Notification": {
        setModal({ open: true, title: action, content: <p>Notification sent to {student.name}'s email/parent.</p>, pos: null, noHeader: false });
        break;
      }

      default:
        setModal({ open: true, title: action, content: <p>Unknown action</p>, pos: null, noHeader: false });
    }

    setMenuOpenIndex(null);
  };

  // search state
  const [searchQuery, setSearchQuery] = useState("");

  // derived filtered list
  const filteredViolations = violations.filter((v) => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (String(v.id || "")).toLowerCase().includes(q) ||
      (v.name || "").toLowerCase().includes(q) ||
      (v.department || v.dept || "").toLowerCase().includes(q) ||
      (v.year || "").toLowerCase().includes(q) ||
      (v.section || "").toLowerCase().includes(q) ||
      (v.violation || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="incident-container">
      {/* Header */}
      <div className="incident-header-bar">
        <h1 className="incident-title">
          Student Management ▸ Incident Management
        </h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">OSA</span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* Violation Entry */}
      <div className="violation-entry">
        <h3>Violation Entry</h3>
        <div className="form-grid">
          <div>
            <label>Name of Student</label>
            <input type="text" value={selectedStudent?.name || ""} readOnly />
          </div>
          <div>
            <label>Year</label>
            <input type="text" value={selectedStudent?.year || ""} readOnly />
          </div>
          <div>
            <label>Student ID</label>
            <input type="text" value={selectedStudent?.id || ""} readOnly />
          </div>
          <div>
            <label>Types of Violation</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="">Select Violation</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
            </select>
          </div>
          <div>
            <label>Number of Offense</label>
            <select
              name="offense"
              value={formData.offense}
              onChange={handleChange}
            >
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="3rd">3rd</option>
            </select>
          </div>
          <div>
            <label>Violation</label>
            <select
              name="violation"
              value={formData.violation}
              onChange={handleChange}
              disabled={!formData.type}
            >
              <option value="">Select</option>
              {violationOptions.length > 0
                ? violationOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))
                : (
                    <>
                      <option value="No Uniform">No Uniform</option>
                      <option value="Cheating">Cheating</option>
                      <option value="Disrespect">Disrespect</option>
                    </>
                  )}
            </select>
          </div>
          <div>
            <label>Department</label>
            <input type="text" value={selectedStudent?.department || selectedStudent?.dept || ""} readOnly />
          </div>
          <div>
            <label>Section</label>
            <input type="text" value={selectedStudent?.section || ""} readOnly />
          </div>
          <div>
            <label>Grade</label>
            <input type="text" value={selectedStudent?.grade || ""} readOnly />
          </div>
          <div>
            <label>Strand</label>
            <input type="text" value={selectedStudent?.strand || ""} readOnly />
          </div>

          <div>
            <label>Sanction</label>
            <select
              name="sanction"
              value={formData.sanction}
              onChange={handleChange}
              disabled={!formData.type}
            >
              <option value="">Select Sanction</option>
              {sanctionOptions.length > 0
                ? sanctionOptions.map((opt) => (
                    <option key={opt.id} value={opt.name}>
                      {opt.name}
                    </option>
                  ))
                : (
                    <>
                      <option value="Oral Warning">Oral Warning</option>
                      <option value="Written Warning">Written Warning</option>
                      <option value="Suspension">Suspension</option>
                      <option value="Exclusion">Exclusion</option>
                      <option value="Community Service">Community Service</option>
                    </>
                  )}
            </select>
          </div>

          <div>
            <label style={{ visibility: "hidden" }}>Add</label>
            <button className="add-btn" onClick={handleAddViolation}>
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Table Header Controls */}
      <div className="table-controls">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name, id, violation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="controls-right">
          <button
            className="bulk-upload"
            onClick={() => document.getElementById("bulkUploadInput").click()}
          >
            Bulk Upload
          </button>
          <input
            type="file"
            id="bulkUploadInput"
            style={{ display: "none" }}
            onChange={handleBulkUpload}
          />

          <button
            ref={exportBtnRef}
            className="export-btn"
            onClick={handleExport}
          >
            Export
          </button>

          <button
            className="filter-btn"
            onClick={(e) => {
              const anchor = e.currentTarget;
              if (!anchor) {
                setModal({
                  open: true,
                  title: "",
                  noHeader: true,
                  pos: null,
                  content: (
                    <FilterPopover
                      onApply={(filters) => { console.log("Filters applied:", filters); setModal({ open: false, title: "", content: null, pos: null, noHeader: false }); }}
                      onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
                    />
                  ),
                });
                return;
              }

              const rect = anchor.getBoundingClientRect();
              const popoverWidth = 360;
              const popoverHeight = 420;

              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const scrollX = window.scrollX || window.pageXOffset;
              const scrollY = window.scrollY || window.pageYOffset;

              let left = rect.right - popoverWidth + scrollX;
              let top = rect.top + scrollY - popoverHeight - 8;

              if (top < 8) {
                top = rect.bottom + scrollY + 8;
              }

              if (left < 8 + scrollX) {
                left = rect.left + scrollX;
              }
              if (left + popoverWidth > vw - 8 + scrollX) {
                left = Math.max(8 + scrollX, vw - popoverWidth - 8 + scrollX);
              }

              if (top + popoverHeight > vh - 8 + scrollY) {
                top = Math.max(8 + scrollY, vh - popoverHeight - 8 + scrollY);
              }

              setModal({
                open: true,
                title: "",
                noHeader: true,
                pos: { left, top },
                content: (
                  <FilterPopover
                    onApply={(filters) => {
                      console.log("Filters applied:", filters);
                      setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
                    }}
                    onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
                  />
                ),
              });
            }}
          >
            Filter
          </button>
        </div>
      </div>

      {/* Data Table */}
      <table className="incident-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Year</th>
            <th>Section</th>
            <th>Violation</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredViolations.map((v, index) => (
            <tr key={index}>
              <td>{v.id}</td>
              <td>{v.name}</td>
              <td>{v.department || v.dept}</td>
              <td>{v.year}</td>
              <td>{v.section}</td>
              <td>{v.violation}</td>
              <td>
                <button
                  className="menu-btn"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setModal({
                      open: true,
                      title: "Actions",
                      noHeader: true,
                      pos: { left: rect.left + window.scrollX, top: rect.bottom + window.scrollY },
                      content: (
                        <div className="action-modal-buttons">
                          <button onClick={() => handleMenuAction("View Student Profile", v)}>
                            View Student Profile
                          </button>
                          <button onClick={() => handleMenuAction("Edit Violation", v)}>
                            Edit Violation
                          </button>
                          <button onClick={() => handleMenuAction("Process", v)}>
                            Process
                          </button>
                          <button onClick={() => handleMenuAction("Send Notification", v)}>
                            Send Notification
                          </button>
                          <button onClick={() => handleMenuAction("Delete", v)}>
                            Delete
                          </button>
                        </div>
                      ),
                    });
                  }}
                >
                  ⋮
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {modal.open && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
          }}
        >
          <div
            className={`modal-content ${modal.pos ? "popover" : ""}`}
            style={modal.pos ? { left: modal.pos.left + "px", top: modal.pos.top + "px" } : {}}
          >
            {!modal.noHeader && modal.title && <h2 className="modal-title">{modal.title}</h2>}

            {modal.content}

            {!modal.noHeader && (
              <div className="modal-actions">
                <button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download Template at Bottom Right */}
      <div className="download-template">
        <button onClick={handleDownloadTemplate}>Download Template</button>
      </div>
    </div>
  );
}

export default IncidentPage;

/* ===========================
   EditIncidentForm component (for updating incidents)
   =========================== */
function EditIncidentForm({ initial, onSave, onCancel }) {
  const [local, setLocal] = useState({ ...initial });

  useEffect(() => {
    setLocal({ ...initial });
  }, [initial]);

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <label>
          Type
          <select value={local.type} onChange={(e) => setLocal((p) => ({ ...p, type: e.target.value }))}>
            <option value="">Select</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
          </select>
        </label>

        <label>
          Violation
          <input type="text" value={local.violation || ""} onChange={(e) => setLocal((p) => ({ ...p, violation: e.target.value }))} />
        </label>

        <label>
          Sanction
          <input type="text" value={local.sanction || ""} onChange={(e) => setLocal((p) => ({ ...p, sanction: e.target.value }))} />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onSave(local)}>Save</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   MajorOffenseModal component (unchanged from earlier)
   =========================== */
function MajorOffenseModal({ step, student, savedData, onSave, onClose }) {
  const [step1, setStep1] = useState({ incidentReport: savedData?.incidentReport || "" });
  const [step2, setStep2] = useState({
    chairDean: savedData?.chairDean || "",
    facultyMember: savedData?.facultyMember || "",
    sscRep: savedData?.sscRep || "",
    dscRep: savedData?.dscRep || "",
    guidance: savedData?.guidance || "",
  });
  const [step3, setStep3] = useState({
    complainant: !!savedData?.complainant,
    respondentPresent: !!savedData?.respondentPresent,
    parentsPresent: !!savedData?.parentsPresent,
    witnessTestimonies: !!savedData?.witnessTestimonies,
    finalStatements: !!savedData?.finalStatements,
  });
  const [step4, setStep4] = useState({ sanction: savedData?.sanction || "" });
  const [step5, setStep5] = useState({ decisionApproval: savedData?.decisionApproval || "" });

  const renderProgress = (activeIndex) => {
    const dots = [1, 2, 3, 4, 5];
    return (
      <div className="major-modal-progress" aria-hidden>
        {dots.map((d) => (
          <span key={d} className={`dot ${d <= activeIndex ? "active" : ""}`} />
        ))}
      </div>
    );
  };

  const saveCurrent = () => {
    if (step === 1) onSave(1, step1);
    else if (step === 2) onSave(2, step2);
    else if (step === 3) onSave(3, step3);
    else if (step === 4) onSave(4, step4);
    else if (step === 5) onSave(5, step5);
  };

  const isLast = step === 5;

  return (
    <div className="major-modal-container">
      <div className="major-modal-topbar" />
      <div className="major-modal-body">
        <div className="major-modal-header-strip">
          <div className="major-modal-title">Major Offense</div>
        </div>

        {step === 1 && <div className="major-modal-subtitle">Filing &amp; Investigation</div>}
        {step === 2 && <div className="major-modal-subtitle">Committee on Discipline is formed</div>}
        {step === 3 && <div className="major-modal-subtitle">Hearing Conducted</div>}
        {step === 4 && <div className="major-modal-subtitle">Sanction Imposed</div>}
        {step === 5 && <div className="major-modal-subtitle">Final Decision with committee submitted findings</div>}

        {renderProgress(step)}

        {step === 1 && (
          <div className="major-modal-step">
            <label>Incident Report</label>
            <textarea placeholder="Write incident report..." value={step1.incidentReport} onChange={(e) => setStep1({ incidentReport: e.target.value })} />
            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="major-modal-step">
            <div className="major-modal-committee">
              <div>
                <label>Appointed Chair or College Dean</label>
                <input type="text" value={step2.chairDean} onChange={(e) => setStep2((s) => ({ ...s, chairDean: e.target.value }))} />
              </div>
              <div>
                <label>Faculty Member</label>
                <input type="text" value={step2.facultyMember} onChange={(e) => setStep2((s) => ({ ...s, facultyMember: e.target.value }))} />
              </div>
              <div>
                <label>SSC Chairperson (or rep)</label>
                <input type="text" value={step2.sscRep} onChange={(e) => setStep2((s) => ({ ...s, sscRep: e.target.value }))} />
              </div>
              <div>
                <label>DSC President (or rep)</label>
                <input type="text" value={step2.dscRep} onChange={(e) => setStep2((s) => ({ ...s, dscRep: e.target.value }))} />
              </div>
              <div className="full">
                <label>Guidance Counselor (non-voting, advisory)</label>
                <input type="text" value={step2.guidance} onChange={(e) => setStep2((s) => ({ ...s, guidance: e.target.value }))} />
              </div>
            </div>

            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="major-modal-step">
            <div className="major-modal-checkboxes">
              <label><input type="checkbox" checked={step3.complainant} onChange={(e) => setStep3((s) => ({ ...s, complainant: e.target.checked }))} /> Complainant</label>
              <label><input type="checkbox" checked={step3.respondentPresent} onChange={(e) => setStep3((s) => ({ ...s, respondentPresent: e.target.checked }))} /> Respondent present.</label>
              <label><input type="checkbox" checked={step3.parentsPresent} onChange={(e) => setStep3((s) => ({ ...s, parentsPresent: e.target.checked }))} /> Parents/Guardians may be present.</label>
              <label><input type="checkbox" checked={step3.witnessTestimonies} onChange={(e) => setStep3((s) => ({ ...s, witnessTestimonies: e.target.checked }))} /> Witness testimonies &amp; cross-examinations.</label>
              <label style={{ gridColumn: "1 / -1" }}><input type="checkbox" checked={step3.finalStatements} onChange={(e) => setStep3((s) => ({ ...s, finalStatements: e.target.checked }))} /> Final statements.</label>
            </div>

            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="major-modal-step">
            <label>Choose a Sanction</label>
            <div className="sanction-row">
              <select className="sanction-select" value={step4.sanction} onChange={(e) => setStep4({ sanction: e.target.value })}>
                <option value="">Select</option>
                <option value="Suspension">Suspension</option>
                <option value="Exclusion">Exclusion</option>
                <option value="Community Service">Community Service</option>
                <option value="Written Warning">Written Warning</option>
              </select>
            </div>

            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="major-modal-step">
            <label>Decision Approval</label>
            <select value={step5.decisionApproval} onChange={(e) => setStep5({ decisionApproval: e.target.value })}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>

            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>{isLast ? "Done" : "Save"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Add FilterPopover component */
function FilterPopover({ onApply, onClose }) {
  const [alphaAZ, setAlphaAZ] = useState(false);
  const [alphaZA, setAlphaZA] = useState(false);
  const [department, setDepartment] = useState("BSIT");
  const [year, setYear] = useState("");

  const apply = () => {
    onApply({ alphaAZ, alphaZA, department, year });
  };

  return (
    <div className="filter-popover">
      <div className="filter-header">Filter</div>
      <div className="filter-body">
        <div className="filter-section">
          <h4>Alphabetical</h4>
          <label className="filter-item"><input type="checkbox" checked={alphaAZ} onChange={(e) => { setAlphaAZ(e.target.checked); if (e.target.checked) setAlphaZA(false); }} /> <span>Filter by A-Z</span></label>
          <label className="filter-item"><input type="checkbox" checked={alphaZA} onChange={(e) => { setAlphaZA(e.target.checked); if (e.target.checked) setAlphaAZ(false); }} /> <span>Filter by Z-A</span></label>
        </div>

        <div className="filter-section">
          <h4>Department</h4>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="filter-select">
            <option>BSIT</option>
            <option>BSED</option>
            <option>BSBA</option>
          </select>
        </div>

        <div className="filter-section">
          <h4>Year Level</h4>
          <div className="filter-year-grid">
            <label><input type="radio" name="year" checked={year === "I"} onChange={() => setYear("I")} /> <span>I</span></label>
            <label><input type="radio" name="year" checked={year === "III"} onChange={() => setYear("III")} /> <span>III</span></label>
            <label><input type="radio" name="year" checked={year === "II"} onChange={() => setYear("II")} /> <span>II</span></label>
            <label><input type="radio" name="year" checked={year === "IV"} onChange={() => setYear("IV")} /> <span>IV</span></label>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-back" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
