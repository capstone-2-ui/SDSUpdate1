import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./IncidentPage.css";

function IncidentPage() {
  const API_BASE = "http://localhost/SDSUpdate1-main/backend/Incident.php";
  const BACKEND_BASE = "http://localhost/SDSUpdate1-main/backend";

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
  const [strandOptions, setStrandOptions] = useState([]); // backend strands

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

  // helper: return canonical student id from either an incident row or a student object
  const getCanonicalStudentId = (obj) => {
    if (!obj) return "";
    // prefer explicit student_id fields, fall back to nested student object fields
    return (
      obj.student_id ??
      obj.studentId ??
      obj.student?.student_id ??
      obj.student?.id ??
      undefined
    );
  };

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

      // extract the array payload in either shape the backend may return
      let items = [];
      if (Array.isArray(data)) items = data;
      else if (data && Array.isArray(data.incidents)) items = data.incidents;
      else items = [];

      // Normalize each incident so it has top-level name/grade/section/department/year etc.
      const normalized = items.map((it) => {
        const studentObj = it.student || {};
        // helpers: prefer top-level value, then student.*, then common alternate keys
        const pick = (...keys) => {
          for (const k of keys) {
            if (k == null) continue;
            // support dotted keys like 'student.firstName' by resolving via studentObj when needed
            if (k.includes('.') && k.startsWith('student.')) {
              const kk = k.split('.').slice(1).join('.');
              if (studentObj[kk] !== undefined) return studentObj[kk];
            } else if (it[k] !== undefined) return it[k];
          }
          return undefined;
        };

        // simpler explicit fallbacks (more readable)
        const name =
          it.name ??
          it.student_name ??
          studentObj.name ??
          studentObj.fullName ??
          it.full_name ??
          "";

        const department =
          it.department ??
          it.dept ??
          studentObj.department ??
          studentObj.dept ??
          it.college ??
          "";

        const grade =
          it.grade ??
          it.year ??
          it.level ??
          studentObj.grade ??
          studentObj.year ??
          studentObj.level ??
          "";

        const year =
          it.year ??
          it.grade ??
          it.level ??
          studentObj.year ??
          studentObj.grade ??
          studentObj.level ??
          "";

        const section =
          it.section ??
          it.sec ??
          it.section_name ??
          it.sectionName ??
          studentObj.section ??
          studentObj.sec ??
          "";

        const strand =
          it.strand ??
          studentObj.strand ??
          it.track ??
          "";

        // new: normalize type and offense (supports various backend key names)
        const type =
          it.type ??
          it.violation_type ??
          it.violationType ??
          studentObj.type ??
          "";

        const offense =
          it.offense ??
          it.offence ??
          it.offense_number ??
          it.offenseLevel ??
          studentObj.offense ??
          "1st";

        const student_id =
          it.student_id ??
          it.studentId ??
          studentObj.student_id ??
          studentObj.id ??
          it.student_id_original ??
          it.studentIdOriginal ??
          undefined;

        return {
          ...it,
          // ensure these top-level keys exist for consistent rendering
          name,
          department,
          grade,
          year,
          section,
          strand,
          student_id,
          // include normalized type/offense so later UI can always read them
          type,
          offense,
        };
      });

      setViolations(normalized);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setViolations([]);
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
    const headers = ["Student ID", "Name", "Department", "Year", "Section", "Violation"];
    const rows = violations.map((v) => [
      v.student_id || v.id,
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
      student_id: selectedStudent?.student_id ?? selectedStudent?.id,
      name: selectedStudent.name,
      department: selectedStudent.department || selectedStudent.dept || "",
      grade: selectedStudent.grade || selectedStudent.level || "",
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
            {/* show email if present */}
            { (student.email || student.parentEmail) && <p><b>Email:</b> {student.email ?? student.parentEmail}</p> }

            <p><b>Department:</b> {student.department || student.dept || "-"}</p>
            <p><b>Grade:</b> {student.grade ?? student.level ?? "-"}</p>
            <p><b>Strand:</b> {student.strand ??"-"}</p>
            <p><b>Year:</b> {student.year ?? "-"}</p>
            <p><b>Section:</b> {student.section ?? "-"}</p>

            {/* NEW: display Type of violation and Number of offense */}
            <p><b>Type of Violation:</b> { (student.type ?? student.violation_type ?? student.violationType) ? (student.type ?? student.violation_type ?? student.violationType) : "-" }</p>
            <p><b>Number of Offense:</b> {
              // If offense is the special "Major" choice, show Major.
              ( (student.offense === "Major" || (student.type && String(student.type).toLowerCase() === "major")) ? "Major" : (student.offense ?? "-") )
            }</p>

            {/* incident-specific fields (if present) */}
            {student.violation && <p><b>Violation:</b> {student.violation}</p>}
            {student.sanction && <p><b>Sanction:</b> {student.sanction}</p>}
          </div>
        );
        setModal({ open: true, title: "View Student Profile", content, pos: null, noHeader: false });
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
          offense: student.offense || "",
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
              <p>Delete incident for <strong>{student.name}</strong> (ID: {student.student_id ?? student.id})?</p>
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
        const studentSavedData = majorData[student.id] || {};

        // warn if not a Major-type and nothing saved yet
        if ((student.type || student.violation || "").toLowerCase() !== "major" && (formData.type !== "Major")) {
          if (!lastSaved) {
            setModal({ open: true, title: action, content: <p>Please set the violation type to <b>Major</b> first to start the process.</p>, pos: null, noHeader: false });
            break;
          }
        }

        // If all steps already completed, show a modal summarizing all 5 steps
        if (lastSaved >= 5) {
          setModal({
            open: true,
            title: (
              <div className="modal-header-flex">
                <span>Process - Completed</span>
                <span className="student-name-brown">{student.name}</span>
              </div>
            ),
            pos: null,
            noHeader: false,
            content: (
              <CompletedMajorStepsModal
                student={student}
                data={studentSavedData}
                onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
              />
            ),
          });
          break;
        }

        // otherwise continue the normal flow to open the next step
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
            <input type="text" value={selectedStudent?.student_id ?? selectedStudent?.id ?? ""} readOnly />
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
              <option value="Select">Select</option>
              <option value="1st">1st</option>
              <option value="2nd">2nd</option>
              <option value="Major">Major</option>
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
            <th>Student ID</th>
            <th>Name</th>
            <th>Department</th>
            <th>Grade</th>
            <th>Section</th>
            <th>Violation</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredViolations.map((v, index) => {
            // grade can be stored as grade, year, or level depending on source
            const grade = v.grade ?? v.year ?? v.level ?? "";
            // section can be stored under different keys in different responses
            const section = v.section ?? v.sec ?? v.section_name ?? v.sectionName ?? "";
            const department = v.department ?? v.dept ?? "";
            return (
              <tr key={index}>
                <td>{getCanonicalStudentId(v) || "-"}</td>
                <td>{v.name || "-"}</td>
                <td>{department || "-"}</td>
                <td>{grade || "-"}</td>
                <td>{section || "-"}</td>
                <td>{v.violation || "-"}</td>
                <td>
                  <button
                    className="menu-btn"
                    onClick={() => {
                      // Open a centered modal (pos: null) and show the clicked student's name in the header (brown)
                      setModal({
                        open: true,
                        title: (
                          <div className="modal-header-flex">
                            <span></span>
                            <span className="student-name-brown">{v.name}</span>
                          </div>
                        ),
                        noHeader: false,
                        pos: null, // center modal instead of popover
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
            );
          })}
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

  // Backend base (kept local to the component so this snippet can be pasted without other edits)
  const BACKEND_BASE = "http://localhost/SDSUpdate1-main/backend";

  // Dropdown option states
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [strands, setStrands] = useState([]);
  const [sections, setSections] = useState([]);
  const [violationOpts, setViolationOpts] = useState([]);
  const [sanctionOpts, setSanctionOpts] = useState([]);

  const [loading, setLoading] = useState({
    deps: false, grades: false, strands: false, sections: false, violations: false, sanctions: false
  });

// ...existing code...
  // small helper to normalise API responses to {id, name}[]
  const normalizeList = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map((it) => {
        return {
          // prefer existing id-like fields; add common backend id names (sanction_id, violation_id, strand_id)
          id:
            it.id ??
            it.sanction_id ??
            it.violation_id ??
            it.strand_id ??
            it.department_id ??
            it.grade_id ??
            it.section_id ??
            it.value ??
            it.code ??
            it.name ??
            "",
          // include many common name fields so endpoints like Sanction.php (sanction),
          // Violation.php (violation) and Strand.php (strand) are handled transparently.
          name:
            it.name ??
            it.sanction ??
            it.violation ??
            it.strand ??
            it.department ??
            it.grade ??
            it.section ??
            it.label ??
            it.value ??
            String(it.id ?? ""),
        };
      });
    }
    // If the response is an object with an array property (e.g., { sanctions: [...] }), unwrap it.
    const keys = Object.keys(raw || {});
    for (const k of keys) {
      if (Array.isArray(raw[k])) return normalizeList(raw[k]);
    }
    return [];
  };
// ...existing code...

  // fetch generic endpoint and set state via setter
  const fetchList = async (url, setter, loadingKey) => {
    setLoading((s) => ({ ...s, [loadingKey]: true }));
    try {
      const res = await fetch(url);
      const data = await res.json();
      setter(normalizeList(data));
    } catch (err) {
      console.error("Failed to load", url, err);
      setter([]); // fallback to empty
    } finally {
      setLoading((s) => ({ ...s, [loadingKey]: false }));
    }
  };

  // ...existing code...
  // load master dropdowns once
  useEffect(() => {
    // basic master data
    fetchList(`${BACKEND_BASE}/Department.php`, setDepartments, "deps");
    fetchList(`${BACKEND_BASE}/Grade.php`, setGrades, "grades");
    fetchList(`${BACKEND_BASE}/Strand.php`, setStrands, "strands");
    fetchList(`${BACKEND_BASE}/Section.php`, setSections, "sections");

    // Load full lists for violations & sanctions (no type filter) so edit modal can show backend values immediately
    fetchList(`${BACKEND_BASE}/Violation.php`, (list) => {
      setViolationOpts(list);
      // If editing and local has no violation, set a default from backend
      setLocal((p) => {
        if (p.violation && String(p.violation).trim()) return p;
        return list.length ? { ...p, violation: p.violation || list[0].name } : p;
      });
    }, "violations");

    fetchList(`${BACKEND_BASE}/Sanction.php?action=read`, (list) => {
    setSanctionOpts(list);
      // If editing and local has no sanction, set a default from backend
      setLocal((p) => {
        if (p.sanction && String(p.sanction).trim()) return p;
        return list.length ? { ...p, sanction: p.sanction || list[0].name } : p;
      });
    }, "sanctions");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
// ...existing code...
  // load violations & sanctions when type changes (local.type)
  useEffect(() => {
    const t = local.type;
    if (!t) {
      setViolationOpts([]);
      setSanctionOpts([]);
      return;
    }

     const q = `?action=read&type=${encodeURIComponent(t)}`;

    // fetch violations for type
    fetchList(`${BACKEND_BASE}/Violation.php${q}`, (list) => {
      setViolationOpts(list);
      if (!local.violation && list.length) {
        setLocal((p) => ({ ...p, violation: list[0].name }));
      }
    }, "violations");

    // fetch sanctions for type
    fetchList(`${BACKEND_BASE}/Sanction.php${q}`, (list) => {
      setSanctionOpts(list);
      if (!local.sanction && list.length) {
        setLocal((p) => ({ ...p, sanction: list[0].name }));
      }
    }, "sanctions");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local.type]);

  const handleChange = (key, value) => {
    setLocal((p) => ({ ...p, [key]: value }));
  };

  const handleSave = () => {
    if (!local.violation || !String(local.violation).trim()) {
      alert("Please enter a Violation description.");
      return;
    }
    // Guarantee an id is present in the payload (backend may use different id key)
    const payload = { ...local, id: local.id ?? local.incident_id ?? local.incidentId ?? local.student_id ?? local.studentId };
    onSave(payload);
  };

  // helper to render options
  const renderOptions = (list) => {
    if (!list || list.length === 0) return <option value="">No options</option>;
    return [
      <option key="__empty__" value="">Select</option>,
      ...list.map((o) => <option key={o.id ?? o.name} value={o.name}>{o.name}</option>)
    ];
  };

  return (
    <div className="edit-incident-form card">
      <div className="eif-header">
        <div className="eif-header-left">
          <div className="avatar">{(local.name || "—").split(" ").map(n => n[0]).slice(0,2).join("") || "S"}</div>
          <div>
            <h3 id="edit-incident-title" className="eif-title">{local.name || "Edit Violation"}</h3>
            <div className="eif-sub">
              <span className="student-name">{local.name || "—"}</span>
              <span className="student-id">{local.student_id ?? local.id ?? ""}</span>
            </div>
          </div>
        </div>
        <div className="eif-header-right">
          <div className="type-pill">{local.type || "Type: —"}</div>
        </div>
      </div>

      <div className="eif-grid">
        <label className="eif-label">
          <span className="lbl">Student ID</span>
          <input className="eif-input" type="text" value={local.student_id ?? local.id ?? ""} readOnly />
        </label>

        <label className="eif-label">
          <span className="lbl">Type</span>
          <select className="eif-input" value={local.type || ""} onChange={(e) => handleChange("type", e.target.value)}>
            <option value="">Select</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Number of Offense</span>
          <select className="eif-input" value={local.offense ?? ""} onChange={(e) => handleChange("offense", e.target.value)}>
            <option value="">Select</option>
            <option value="1st">1st</option>
            <option value="2nd">2nd</option>
            <option value="Major">Major</option>
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Department</span>
          <select className="eif-input" value={local.department || local.dept || ""} onChange={(e) => handleChange("department", e.target.value)}>
            { loading.deps ? <option>Loading...</option> : renderOptions(departments) }
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Year</span>
          <select className="eif-input" value={local.year || local.grade || ""} onChange={(e) => handleChange("year", e.target.value)}>
            { loading.grades ? <option>Loading...</option> : renderOptions(grades) }
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Grade</span>
          <select className="eif-input" value={local.grade || ""} onChange={(e) => handleChange("grade", e.target.value)}>
            { loading.grades ? <option>Loading...</option> : renderOptions(grades) }
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Strand</span>
          <select className="eif-input" value={local.strand || ""} onChange={(e) => handleChange("strand", e.target.value)}>
            { loading.strands ? <option>Loading...</option> : renderOptions(strands) }
          </select>
        </label>

        <label className="eif-label">
          <span className="lbl">Section</span>
          <select className="eif-input" value={local.section || ""} onChange={(e) => handleChange("section", e.target.value)}>
            { loading.sections ? <option>Loading...</option> : renderOptions(sections) }
          </select>
        </label>

        <label className="eif-label full">
          <span className="lbl">Violation</span>
          <select
            className="eif-input"
            value={local.violation || ""}
            onChange={(e) => handleChange("violation", e.target.value)}
          >
            { loading.violations ? <option>Loading...</option> : renderOptions(violationOpts) }
          </select>
        </label>

        <label className="eif-label full">
          <span className="lbl">Sanction</span>
          <select
            className="eif-input"
            value={local.sanction || ""}
            onChange={(e) => handleChange("sanction", e.target.value)}
          >
            { loading.sanctions ? <option>Loading...</option> : renderOptions(sanctionOpts) }
          </select>
        </label>
      </div>

      <div className="eif-actions">
        <button className="btn btn-cancel" onClick={onCancel}>Cancel</button>
        <button
          className="btn btn-save"
          onClick={handleSave}
          disabled={!local.violation || !String(local.violation).trim()}
        >
          Save Changes
        </button>
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
          <label className="filter-item">
            <input
              type="checkbox"
              checked={alphaAZ}
              onChange={(e) => { setAlphaAZ(e.target.checked); if (e.target.checked) setAlphaZA(false); }}
            />
            <span>Filter by A-Z</span>
          </label>
          <label className="filter-item">
            <input
              type="checkbox"
              checked={alphaZA}
              onChange={(e) => { setAlphaZA(e.target.checked); if (e.target.checked) setAlphaAZ(false); }}
            />
            <span>Filter by Z-A</span>
          </label>
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

/* ===========================
   CompletedMajorStepsModal component
   =========================== */
function CompletedMajorStepsModal({ student, data = {}, onClose }) {
  // Helper to safely read nested fields
  const s = (stepKey, field, fallback = "—") => {
    const step = data[stepKey] || {};
    const val = field ? step[field] : step;
    if (val === undefined || val === null || val === "") return fallback;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return val;
  };

  return (
    <div className="completed-steps">
      <div style={{ padding: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{student.name}</h3>
          <div style={{ color: "#6b5a4a", fontSize: 13 }}>{student.student_id || student.id || ""}</div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 1 — Filing &amp; Investigation</div>
          <div className="step-body">{s("step1", "incidentReport", "No report saved")}</div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 2 — Committee on Discipline</div>
          <div className="step-body">
            <div><strong>Chair/Dean:</strong> {s("step2", "chairDean")}</div>
            <div><strong>Faculty Member:</strong> {s("step2", "facultyMember")}</div>
            <div><strong>SSC Rep:</strong> {s("step2", "sscRep")}</div>
            <div><strong>DSC Rep:</strong> {s("step2", "dscRep")}</div>
            <div><strong>Guidance:</strong> {s("step2", "guidance")}</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 3 — Hearing</div>
          <div className="step-body">
            <div><strong>Complainant present:</strong> {s("step3", "complainant")}</div>
            <div><strong>Respondent present:</strong> {s("step3", "respondentPresent")}</div>
            <div><strong>Parents present:</strong> {s("step3", "parentsPresent")}</div>
            <div><strong>Witness testimonies:</strong> {s("step3", "witnessTestimonies")}</div>
            <div><strong>Final statements:</strong> {s("step3", "finalStatements")}</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 4 — Sanction</div>
          <div className="step-body">{s("step4", "sanction", "No sanction selected")}</div>
        </div>

        <div className="step-card">
          <div className="step-title">Step 5 — Decision Approval</div>
          <div className="step-body">{s("step5", "decisionApproval", "Not recorded")}</div>
        </div>

        <div className="major-modal-actions" style={{ marginTop: 14 }}>
          <button className="btn-back" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
