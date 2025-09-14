import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentIncidentPage.css";

const API_URL = "http://localhost/SDSUpdate1-main/backend/Student.php"; 
const GRADE_URL = "http://localhost/SDSUpdate1-main/backend/Grade.php";
const SECTION_URL = "http://localhost/SDSUpdate1-main/backend/Section.php";
const STRAND_URL = "http://localhost/SDSUpdate1-main/backend/Strand.php";
const DEPARTMENT_URL = "http://localhost/SDSUpdate1-main/backend/Department.php";
const INCIDENT_URL = "http://localhost/SDSUpdate1-main/backend/Incident.php"; // <- new

export default function StudentIncidentPage() {
  const [students, setStudents] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [filterAZ, setFilterAZ] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterStrand, setFilterStrand] = useState("");
  const fileInputRef = useRef(null);
  const filterRef = useRef(null);
  const navigate = useNavigate();

  // Dropdown data
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [strands, setStrands] = useState([]);
  const [departments, setDepartments] = useState([]);

  // new: per-student incidents + computed counts
  const [studentIncidents, setStudentIncidents] = useState([]);
  const [violationCounts, setViolationCounts] = useState({});

  // --- Helper: a simple reload function to keep UI in sync ---
  const reloadStudents = () => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setStudents(data))
      .catch((err) => console.error("Fetch error:", err));
  };

  // Fetch students on load
  useEffect(() => {
    reloadStudents();
  }, []);

  // Fetch dropdown data
  useEffect(() => {
    fetch(GRADE_URL)
      .then((res) => res.json())
      .then((data) => setGrades(data))
      .catch((err) => console.error("Grade fetch error:", err));

    fetch(SECTION_URL)
      .then((res) => res.json())
      .then((data) => setSections(data))
      .catch((err) => console.error("Section fetch error:", err));

    fetch(STRAND_URL)
      .then((res) => res.json())
      .then((data) => setStrands(data))
      .catch((err) => console.error("Strand fetch error:", err));

    fetch(DEPARTMENT_URL)
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error("Department fetch error:", err));
  }, []);

  // Close filter if clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Add Student (POST)
  const handleAddStudent = (e) => {
    e.preventDefault();
    const form = e.target;
    const newStudent = {
      name: form.name.value,
      email: form.email.value,
      student_id: form.id.value, // backend expects 'student_id'
      department: form.department?.value || "",
      year: form.year?.value || "",
      grade: form.grade?.value || "",
      section: form.section?.value || "",
      strand: form.strand?.value || "",
      level: selectedLevel,
      status: "Active",
    };

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStudent),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // refresh list from backend to get canonical record (id, student_id, etc.)
          reloadStudents();
          setShowAddModal(false);
          setSelectedLevel("");
        } else {
          alert("Error adding student: " + (data.error || data.message));
        }
      })
      .catch((err) => {
        console.error("Add error:", err);
        alert("Add failed. See console for details.");
      });

  };

  // Edit Student (PUT)
  const handleEditStudent = (e) => {
    e.preventDefault();
    const form = e.target;

    // Use FormData to reliably get named inputs (works even if form.* properties are missing)
    const fd = new FormData(form);

    // New values (from form) or fallbacks to the selectedStudent
    const newStudentId = (fd.get("id") || selectedStudent?.student_id || selectedStudent?.id || "").toString();
    const name = (fd.get("name") || "").toString();
    const email = (fd.get("email") || "").toString();
    const department = (fd.get("department") || "").toString();
    const year = (fd.get("year") || "").toString();
    const grade = (fd.get("grade") || "").toString();
    const section = (fd.get("section") || "").toString();
    const strand = (fd.get("strand") || "").toString();
    const status = (fd.get("status") || selectedStudent?.status || "Active").toString();

    // original identifier so backend can find the correct record even if student_id was changed
    const originalId = (selectedStudent?.student_id ?? selectedStudent?.id ?? "").toString();

    const updatedStudent = {
      // DB numeric id (optional; backend may use it as fallback)
      id: selectedStudent?.id ?? null,
      // the (possibly changed) student_id coming from the form
      student_id: newStudentId,
      // the original student identifier (string or numeric) for a safe lookup server-side
      original_student_id: originalId,
      name,
      email,
      department,
      year,
      grade,
      section,
      strand,
      status,
      level: selectedStudent?.level || "",
    };

    fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStudent),
    })
      .then((res) =>
        // guard against empty responses
        res.json().catch(() => ({ success: true, message: "No JSON returned" }))
      )
      .then((data) => {
        // treat both explicit success or affected_rows > 0 as success
        if (data && (data.success === true || data.affected_rows > 0 || data.message)) {
          // refresh canonical data from backend
          reloadStudents();
          setShowEditModal(false);
          setSelectedStudent(null);
        } else {
          const msg = data && (data.error || data.message) ? (data.error || data.message) : "Update failed";
          alert("Update failed: " + msg);
          console.error("Update failed response:", data);
        }
      })
      .catch((err) => {
        console.error("Edit error:", err);
        alert("Update failed. See console for details.");
      });
  };

  // ---- DELETE Student (DELETE) ----
  const handleDeleteStudent = (studentOrId) => {
    // Accept either a student object or a primitive id (string/number)
    let idToDelete = null;
    let displayName = "";

    if (typeof studentOrId === "object" && studentOrId !== null) {
      idToDelete = studentOrId.student_id ?? studentOrId.id;
      displayName = studentOrId.name ?? "";
    } else {
      // primitive passed (id)
      idToDelete = studentOrId;
    }

    if (idToDelete === null || idToDelete === undefined || String(idToDelete).trim() === "") {
      alert("Cannot determine student identifier to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${displayName || idToDelete}" (ID: ${idToDelete})?`)) {
      return;
    }

    fetch(`${API_URL}?id=${encodeURIComponent(idToDelete)}`, {
      method: "DELETE",
    })
      .then((res) => res.json().catch(() => ({ success: false, error: "Invalid JSON response" })))
      .then((data) => {
        if (data && data.success) {
          // Refresh list to reflect canonical backend state
          reloadStudents();
          setShowViewModal(false);
          setSelectedStudent(null);
          alert("Student deleted.");
        } else {
          const msg = data && (data.error || data.message) ? (data.error || data.message) : "Delete failed";
          alert("Delete failed: " + msg);
          console.error("Delete failed:", data);
        }
      })
      .catch((err) => {
        console.error("Error deleting student:", err);
        alert("Delete failed. See console for details.");
      });
  };

  // Bulk upload
  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file); // backend reads $_FILES['file']

    fetch(API_URL, {
      method: "POST",
      body: formData, // do NOT set Content-Type; browser will set boundary
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert(`Bulk upload complete: ${data.rows_processed} rows, ${data.inserted} added/updated`);
          reloadStudents();
        } else {
          alert("Bulk upload failed: " + (data.error || JSON.stringify(data)));
        }
      })
      .catch((err) => {
        console.error("Bulk upload error:", err);
        alert("Bulk upload failed. See console for details.");
      })
      .finally(() => {
        // reset the input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  };

  const handleExport = () => {
    const csv = [
      ["Name", "ID", "Department", "Year"],
      ...students.map((s) => [s.name, s.id, s.department, s.year]),
    ]
      .map((row) => row.join(','))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students.csv";
    a.click();
  };

  const handleDownloadTemplate = () => {
    // Add Email column after ID so template is:
    // Name,ID,Email,Department,Section,Grade,Strand,Year
    const csv = "Name,ID,Email,Department,Section,Grade,Strand,Year\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.csv";
    a.click();
  };

  const goToIncidentPage = (student) => {
    navigate("/incident", { state: { student } });
  };

  // Load incidents (from backend/Incident.php) for a particular student and compute counts
  const loadStudentIncidents = (student) => {
    const sid = student?.student_id ?? student?.id ?? "";
    if (!sid) {
      setStudentIncidents([]);
      setViolationCounts({});
      return;
    }

    fetch(INCIDENT_URL)
      .then((res) => res.json())
      .then((data) => {
        // Incident.php returns an array of rows in the simple case.
        // If API wraps with { success:..., data: [...] } handle that too.
        const rows = Array.isArray(data) ? data : (data.data || []);
        // Filter rows that match this student's id (string-safe compare)
        const studentRows = rows.filter((r) => String(r.student_id) === String(sid) || String(r.id) === String(sid));
        setStudentIncidents(studentRows);

        // Group by 'violation' (fallback to 'type' or 'Unknown')
        const counts = studentRows.reduce((acc, r) => {
          const key = (r.violation && r.violation.trim()) || (r.type && r.type.trim()) || "Unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        setViolationCounts(counts);
      })
      .catch((err) => {
        console.error("Error loading incidents for student:", err);
        setStudentIncidents([]);
        setViolationCounts({});
      });
  };

  // 🔍 Filtering
  const filteredStudents = useMemo(() => {
    let data = [...students];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      data = data.filter((s) => {
        const name = (s.name || "").toString().toLowerCase();
        const sid = (s.student_id || s.id || "").toString().toLowerCase();
        const dept = (s.department || "").toString().toLowerCase();
        const year = (s.year || "").toString().toLowerCase();
        return name.includes(q) || sid.includes(q) || dept.includes(q) || year.includes(q);
      });
    }

    if (filterDepartment) {
      data = data.filter((s) => s.department === filterDepartment);
    }
    if (filterYear) {
      data = data.filter((s) => s.year === filterYear);
    }
    if (filterSection) {
      data = data.filter((s) => (s.section || "") === filterSection);
    }
    if (filterGrade) {
      data = data.filter((s) => (s.grade || "") === filterGrade);
    }
    if (filterStrand) {
      data = data.filter((s) => (s.strand || "") === filterStrand);
    }
    if (filterAZ === "asc") {
      data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (filterAZ === "desc") {
      data.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }
    return data;
  }, [students, filterAZ, filterDepartment, filterYear, filterSection, filterGrade, filterStrand, searchTerm]);

  // Render fields
  const renderFields = (level, student = {}) => {
    switch (level) {
      case "junior":
        return (
          <>
            <label>ID*</label>
            <input name="id" defaultValue={student.student_id ?? student.id} required />

            <label>Grade*</label>
            <select name="grade" defaultValue={student.grade} required>
              <option value="">Select Grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.grade}>
                  {g.grade}
                </option>
              ))}
            </select>


            <label>Section*</label>
            <select name="section" defaultValue={student.section} required>
              <option value="">Select Section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.section}>
                  {s.section}
                </option>
              ))}
            </select> 
          </>
        );

      case "senior":
        return (
          <>
            <label>ID*</label>
            <input name="id" defaultValue={student.id} required />

            <label>Grade*</label>
            <select name="grade" defaultValue={student.grade} required>
              <option value="">Select Grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.grade}>
                  {g.grade}
                </option>
              ))}
            </select>

            <label>Strand*</label>
            <select name="strand" defaultValue={student.strand} required>
              <option value="">Select Strand</option>
              {strands.map((st) => (
                <option key={st.id} value={st.strand}>
                  {st.strand}
                </option>
              ))}
            </select>
          </>
        );

      case "college":
        return (
          <>
            <label>ID*</label>
            <input name="id" defaultValue={student.id} required />

            <label>Department*</label>
            <select name="department" defaultValue={student.department} required>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.department}>
                  {d.department}
                </option>
              ))}
            </select>

            <label>Year*</label>
            <select name="year" defaultValue={student.year} required>
              <option value="">Select Year</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </>
        );

      default:
        return null;
    }
  };

  // Render fields (level-specific) - already present
  const renderEditFieldsAll = (student = {}) => {
    return (
      <>
        <label>Name*</label>
        <input name="name" defaultValue={student.name || ""} required />

        <label>Email*</label>
        <input
          name="email"
          type="email"
          defaultValue={student.email || ""}
          required
        />

        <label>ID*</label>
        {/* backend expects the field named 'id' for the edit form (we pass student_id via this field) */}
        <input name="id" defaultValue={student.student_id ?? student.id ?? ""} required />

        <label>Department</label>
        <select name="department" defaultValue={student.department || ""}>
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id ?? d.name ?? d.department} value={d.name ?? d.department ?? ""}>
              {d.name ?? d.department ?? ""}
            </option>
          ))}
        </select>

        <label>Section</label>
        <select name="section" defaultValue={student.section || ""}>
          <option value="">Select Section</option>
          {sections.map((s) => (
            <option key={s.id ?? s.section} value={s.section ?? ""}>
              {s.section ?? ""}
            </option>
          ))}
        </select>

        <label>Grade</label>
        <select name="grade" defaultValue={student.grade || ""}>
          <option value="">Select Grade</option>
          {grades.map((g) => (
            <option key={g.id ?? g.grade} value={g.grade ?? ""}>
              {g.grade ?? ""}
            </option>
          ))}
        </select>

        <label>Strand</label>
        <select name="strand" defaultValue={student.strand || ""}>
          <option value="">Select Strand</option>
          {strands.map((st) => (
            <option key={st.id ?? st.strand} value={st.strand ?? ""}>
              {st.strand ?? ""}
            </option>
          ))}
        </select>

        <label>Year</label>
        <select name="year" defaultValue={student.year || ""}>
          <option value="">Select Year</option>
          <option value="1st Year">1st Year</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
          <option value="4th Year">4th Year</option>
        </select>
      </>
    );
  };

  const handleApplyFilters = () => {
    // Close dropdown — the state values are already applied as you change them
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    // Reset filter state but keep dropdown open so user can re-select
    setFilterAZ(null);
    setFilterDepartment("");
    setFilterYear("");
    setFilterSection("");
    setFilterGrade("");
    setFilterStrand("");
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header-bar">
        <h1 className="dashboard-title">Student Management</h1>
        <div className="user-account">
          <img src="/RCCLOGO.png" alt="Rcc Logo" className="account-logo" />
          <span className="account-name">OSA</span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* Search + Buttons */}
      <div className="top-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="top-buttons" ref={filterRef}>
          <button className="btn add" onClick={() => setShowAddModal(true)}>
            + Add
          </button>
          <button
            className="btn bulk"
            onClick={() => fileInputRef.current.click()}
          >
            Bulk Upload
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleBulkUpload}
          />
          <button className="btn export" onClick={handleExport}>
            Export
          </button>
          {/* Filter button (improved: focus dropdown on open) */}
          <button
            className="btn filter"
            onClick={() => {
              setFilterOpen((prev) => {
                const next = !prev;
                // when opening, focus first control in the dropdown shortly after render
                if (!next) {
                  // closing -> nothing to do
                } else {
                  setTimeout(() => {
                    const root = filterRef.current;
                    if (!root) return;
                    // prefer a text input/select first
                    const focusable = root.querySelector("select, input[type='text'], input[type='checkbox'], input[type='radio']");
                    if (focusable) focusable.focus();
                  }, 0);
                }
                return next;
              });
            }}
          >
            Filter
          </button>

          {filterOpen && (
            <div className="filter-dropdown" role="region" aria-label="Filters">
              <h3 className="filter-title">Filter</h3>

              {/* Alphabetical */}
              <div className="filter-section">
                <label className="filter-section-title">Alphabetical</label>
                <div className="filter-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={filterAZ === "asc"}
                      onChange={() => setFilterAZ(filterAZ === "asc" ? null : "asc")}
                    />{" "}
                    A → Z
                  </label>
                </div>
                <div className="filter-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={filterAZ === "desc"}
                      onChange={() => setFilterAZ(filterAZ === "desc" ? null : "desc")}
                    />{" "}
                    Z → A
                  </label>
                </div>
              </div>

              {/* Department */}
              <div className="filter-section">
                <label className="filter-section-title">Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => {
                    setFilterDepartment(e.target.value);
                    // If you want dependent selects cleared when department changes, uncomment these:
                    // setFilterSection("");
                    // setFilterGrade("");
                    // setFilterStrand("");
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    // Use the 'department' field for both value and label so it matches student.department
                    <option key={d.id} value={d.department ?? d.name ?? ""}>
                      {d.department ?? d.name ?? ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section (new) */}
              <div className="filter-section">
                <label className="filter-section-title">Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  <option value="">All Sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.section}>
                      {s.section}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade (new) */}
              <div className="filter-section">
                <label className="filter-section-title">Grade</label>
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                >
                  <option value="">All Grades</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.grade}>
                      {g.grade}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strand (new) */}
              <div className="filter-section">
                <label className="filter-section-title">Strand</label>
                <select
                  value={filterStrand}
                  onChange={(e) => setFilterStrand(e.target.value)}
                >
                  <option value="">All Strands</option>
                  {strands.map((st) => (
                    <option key={st.id} value={st.strand}>
                      {st.strand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="filter-section">
                <label className="filter-section-title">Year Level</label>
                <div className="year-radio-group">
                  {["1st Year", "2nd Year", "3rd Year", "4th Year", ""].map((yr, i) => (
                    <label key={i}>
                      <input
                        type="radio"
                        name="year"
                        value={yr}
                        checked={filterYear === yr}
                        onChange={(e) => setFilterYear(e.target.value)}
                      />{" "}
                      {yr || "All"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="student-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>ID</th>
            <th>Department</th>
            <th>Section</th>
            <th>Grade</th>
            <th>Strand</th>
            <th>Year</th>
            <th>Action</th>
            <th>Incident</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.map((s) => (
            <tr key={s.id ?? s.student_id}>
              <td>{s.name}</td>
              <td>{s.student_id ?? s.id}</td>
              <td>{s.department || "-"}</td>
              <td>{s.section || "-"}</td>
              <td>{s.grade || "-"}</td>
              <td>{s.strand || "-"}</td>
              <td>{s.year || "-"}</td>
              <td>
                <button
                  className="btn view"
                  onClick={() => {
                    setSelectedStudent(s);
                    setShowViewModal(true);
                  }}
                >
                  View
                </button>
              </td>
              <td>
                <button
                  className="btn configure"
                  onClick={() => goToIncidentPage(s)}
                >
                  Configure
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Download Template */}
      <div className="download-template">
        <button onClick={handleDownloadTemplate}>Download Template</button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Add Student</h3>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">
                <label>
                  Name<span className="required">*</span>
                </label>
                <input name="name" required />

                <label>
                  Email<span className="required">*</span>
                </label>
                <input name="email" type="email" required />

                {/* Radio Buttons */}
                <div className="radio-group-horizontal">
                  {["junior", "senior", "college"].map((lvl) => (
                    <label key={lvl} className="radio-option">
                      <input
                        type="radio"
                        name="level"
                        value={lvl}
                        checked={selectedLevel === lvl}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        required
                      />
                      {lvl === "junior"
                        ? "Junior High School"
                        : lvl === "senior"
                        ? "Senior High School"
                        : "College"}
                    </label>
                  ))}
                </div>

                {renderFields(selectedLevel)}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn add">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>View Student</h3>
            </div>
            <div className="modal-body">
              <div className="view-details">
                <p>
                  <b>Name:</b> {selectedStudent.name}
                </p>
                <p>
                  <b>Email:</b> {selectedStudent.email || "N/A"}
                </p>  
                <p>
                  <b>Student ID:</b> {selectedStudent.student_id ?? selectedStudent.id}
                </p>
                <p>
                  <b>Department:</b> {selectedStudent.department}
                </p>
                <p>
                  <b>Section:</b> {selectedStudent.section}
                </p>
                <p>
                  <b>Grade:</b> {selectedStudent.grade}
                </p>
                <p>
                  <b>Strand:</b> {selectedStudent.strand}
                </p>
                <p>
                  <b>Year:</b> {selectedStudent.year}
                </p>

                {renderFields(selectedStudent.level, selectedStudent)}

                <p>
                  <b>Status:</b> {selectedStudent.status || "Active"}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn cancel"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button
                className="btn edit"
                onClick={() => {
                  setShowViewModal(false);
                  setShowEditModal(true);
                }}
              >
                Edit
              </button>
              <button
                className="btn delete"
                onClick={() => handleDeleteStudent(selectedStudent)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Student</h3>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="modal-body">
                {renderEditFieldsAll(selectedStudent)}

                <label>Status*</label>
                <select
                  name="status"
                  defaultValue={selectedStudent.status || "Active"}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn add">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
  );
}
