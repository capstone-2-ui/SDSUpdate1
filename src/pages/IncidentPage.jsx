import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./IncidentPage.css";

function IncidentPage() {
  // Sample Students
  const [students] = useState([
    { id: "01", name: "John Doe", dept: "BSIT", year: "III", section: "" },
    { id: "02", name: "Jane Smith", dept: "BSED", year: "II", section: "A" },
  ]);

  const location = useLocation();

  // State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [violations, setViolations] = useState([]); // keep if used elsewhere
  const [violationOptions, setViolationOptions] = useState([]); // options returned by backend for selected violation
  const [sanctionOptions, setSanctionOptions] = useState([]); // options returned by backend for selected sanction

  const [formData, setFormData] = useState({
    type: "",
    sanction: "",
    violation: "",
    offense: "1st",
  });

  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  // modal: { open, title, content, pos: {left, top} | null, noHeader }
  const [modal, setModal] = useState({ open: false, title: "", content: null, pos: null, noHeader: false });

  // ===========================
  // ADD: Major Offense Workflow
  // ===========================
  const [majorSteps, setMajorSteps] = useState({});
  const [majorData, setMajorData] = useState({});

  // Helper: Open Major modal for a specific step
  const openMajorModal = (student, stepToOpen, centered = true) => {
    if (!student) {
      alert("Select a student first!");
      return;
    }
    setModal({
      open: true,
      title: "Major Offense",
      // MajorOffenseModal includes its own topbar/title, so hide outer header
      noHeader: true,
      pos: centered ? null : undefined,
      content: (
        <MajorOffenseModal
          step={stepToOpen}
          student={student}
          savedData={(majorData[student.id] || {})[`step${stepToOpen}`]}
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
  };
  // ===========================
  // END ADD
  // ===========================

  // If navigated with a student in location.state, set it as selected
  useEffect(() => {
    if (location?.state?.student) {
      setSelectedStudent(location.state.student);
    }
  }, [location]);

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
      v.department,
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

  // Form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // When the user selects the type, fetch both violations and sanctions from backend
    if (name === "type") {
      setViolationOptions([]);
      setSanctionOptions([]);
      if (!value) return;

      // Adjust baseUrl if your backend path differs
      const baseUrl = "http://localhost/SDSUpdate1-main/backend/Incident.php";

      // fetch both in parallel: we can request both arrays or request the combined object
      const urlBoth = `${baseUrl}?type=${encodeURIComponent(value)}`;

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

      // (Optional) If you prefer strict per-kind endpoints, you can instead do:
      // Promise.all([
      //   fetch(`${baseUrl}?type=${value}&kind=violations`).then(r=>r.json()),
      //   fetch(`${baseUrl}?type=${value}&kind=sanctions`).then(r=>r.json())
      // ]).then(([viol, sanc]) => { setViolationOptions(viol); setSanctionOptions(sanc); ... })
    }
  };

  // Add violation
  const handleAddViolation = () => {
    if (!selectedStudent) {
      alert("Select a student first!");
      return;
    }

    const newViolation = {
      ...selectedStudent,
      ...formData,
    };

    setViolations((prev) => [...prev, newViolation]);

    // reset dropdowns only
    setFormData({ type: "", sanction: "", violation: "", offense: "1st" });
  };

  // Action Menu Handler (used when a menu item is clicked inside the popover)
  const handleMenuAction = (action, student) => {
    let content;

    switch (action) {
      case "View Student Profile":
        content = (
          <div className="modal-inner-content">
            <h3>{student.name}</h3>
            <p><b>ID:</b> {student.id}</p>
            <p><b>Department:</b> {student.dept}</p>
            <p><b>Year:</b> {student.year}</p>
            <p><b>Section:</b> {student.section}</p>
            <p><b>Violation:</b> {student.violation}</p>
          </div>
        );
        break;
      case "Edit Student Profile":
        content = (
          <div className="modal-inner-content">
            <label>Name:</label>
            <input type="text" defaultValue={student.name} />
            <label>Dept:</label>
            <input type="text" defaultValue={student.dept} />
            <label>Year:</label>
            <input type="text" defaultValue={student.year} />
            <label>Section:</label>
            <input type="text" defaultValue={student.section} />
            <label>Violation:</label>
            <input type="text" defaultValue={student.violation} />
          </div>
        );
        break;
      case "Edit Violation":
        content = (
          <div className="modal-inner-content">
            <label>Violation:</label>
            <input type="text" defaultValue={student.violation} />
            <label>Sanction:</label>
            <input type="text" defaultValue={student.sanction} />
          </div>
        );
        break;
      case "Process":
        {
          // use MajorOffenseModal; hide the redundant outer header
          const lastSaved = majorSteps[student.id] || 0;
          if ((student.type || student.violation || "").toLowerCase() !== "major" && (formData.type !== "Major")) {
            // If the row doesn't explicitly carry "Major", still allow using tracker
            // but only if tracker exists; otherwise, hint
            if (!lastSaved) {
              content = <p>Please set the violation type to <b>Major</b> first to start the process.</p>;
              break;
            }
          }
          if (lastSaved >= 5) {
            content = <p>All steps are already completed for {student.name}.</p>;
            break;
          }
          const nextStep = Math.min(lastSaved + 1, 5);
          content = (
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
          );
        }
        break;
      case "Send Notification":
        content = <p>Notification sent to {student.name}'s email/parent.</p>;
        break;
      default:
        content = <p>Unknown action</p>;
    }

    // If it's the "Process" modal (MajorOffenseModal) we hide outer header; otherwise show header.
    const hideOuterHeader = action === "Process";
    setModal({ open: true, title: action, content, pos: null, noHeader: hideOuterHeader });
    setMenuOpenIndex(null);
  };

  // search state (functional search bar)
  const [searchQuery, setSearchQuery] = useState("");

  // ref for export button (anchor for filter popover)
  const exportBtnRef = useRef(null);

  // derived filtered list (matches id, name, department, year, section, violation)
  const filteredViolations = violations.filter((v) => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (v.id || "").toLowerCase().includes(q) ||
      (v.name || "").toLowerCase().includes(q) ||
      (v.department || "").toLowerCase().includes(q) ||
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
              <option value="3rd">Major</option>
            </select>
          </div>
          <div>
            <label>Violation</label>
            <select
              name="violation"
              value={formData.violation}
              onChange={handleChange}
              disabled={!formData.type} // enable when a Type is chosen
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
                      {/* fallback static options if backend returns none */}
                      <option value="No Uniform">No Uniform</option>
                      <option value="Cheating">Cheating</option>
                      <option value="Disrespect">Disrespect</option>
                    </>
                  )}
            </select>
          </div>
          <div>
            <label>Department</label>
            <input type="text" value={selectedStudent?.department || ""} readOnly />
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
              disabled={!formData.type} // enable when a Type is chosen
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
                      {/* fallback static options */}
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
              const popoverWidth = 360;   // CSS width for .filter-popover
              const popoverHeight = 420;  // approximate height; popover is scrollable if smaller viewport

              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const scrollX = window.scrollX || window.pageXOffset;
              const scrollY = window.scrollY || window.pageYOffset;

              // try positioning above the button, right-aligned with anchor's right edge
              let left = rect.right - popoverWidth + scrollX;
              let top = rect.top + scrollY - popoverHeight - 8;

              // if not enough space above, position below the button
              if (top < 8) {
                top = rect.bottom + scrollY + 8;
              }

              // ensure the popover stays within viewport horizontally
              if (left < 8 + scrollX) {
                // try aligning with anchor left if right-aligned would overflow
                left = rect.left + scrollX;
              }
              if (left + popoverWidth > vw - 8 + scrollX) {
                left = Math.max(8 + scrollX, vw - popoverWidth - 8 + scrollX);
              }

              // ensure the popover stays within viewport vertically (reduce top if it overflows)
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
              <td>{v.department}</td>
              <td>{v.year}</td>
              <td>{v.section}</td>
              <td>{v.violation}</td>
              <td>
                <button
                  className="menu-btn"
                  onClick={(e) => {
                    // position popover under the clicked button
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
                          <button onClick={() => handleMenuAction("Edit Student Profile", v)}>
                            Edit Student Profile
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
            // close when clicking overlay (but not when clicking modal content)
            if (e.target === e.currentTarget) setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
          }}
        >
          <div
            className={`modal-content ${modal.pos ? "popover" : ""}`}
            style={modal.pos ? { left: modal.pos.left + "px", top: modal.pos.top + "px" } : {}}
          >
            {/* Only show outer title/close for regular (non-MajorOffense) modals */}
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
   ADD: MajorOffenseModal component
   =========================== */
function MajorOffenseModal({ step, student, savedData, onSave, onClose }) {
  // Local form states for each step; initialize from savedData if available
  const [step1, setStep1] = useState({
    incidentReport: savedData?.incidentReport || "",
  });
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
  const [step4, setStep4] = useState({
    sanction: savedData?.sanction || "",
  });
  const [step5, setStep5] = useState({
    decisionApproval: savedData?.decisionApproval || "",
  });

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

        {/* Step 1 */}
        {step === 1 && (
          <div className="major-modal-step">
            <label>Incident Report</label>
            <textarea
              placeholder="Write incident report..."
              value={step1.incidentReport}
              onChange={(e) => setStep1({ incidentReport: e.target.value })}
            />
            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Save</button>
            </div>
          </div>
        )}

        {/* Step 2 */}
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

        {/* Step 3 */}
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

        {/* Step 4 */}
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

        {/* Step 5 */}
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

/* Add FilterPopover component (placed after MajorOffenseModal or at file bottom) */
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
