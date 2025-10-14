import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudentIncidentPage.css";

const API_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Student.php"; 
const GRADE_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Grade.php";
const SECTION_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Section.php";
const STRAND_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Strand.php";
const DEPARTMENT_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Department.php";
const INCIDENT_URL = "http://192.168.2.110/SDSUpdate1-main/backend/Incident.php"; // <- new

export default function StudentIncidentPage({ user }) {
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

  // Add-modal grade selection so sections can be filtered live while adding
  const [addFormGrade, setAddFormGrade] = useState("");

  // When the selected level for the Add modal changes, clear any addFormGrade
  useEffect(() => {
    setAddFormGrade("");
  }, [selectedLevel]);
  
  // Confirmation (top-right green toast)
  const timeoutRef = useRef(null);
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

  // ensure timeout cleared on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
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
          setAddFormGrade("");
          showConfirmation("Student added successfully");
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
          showConfirmation("Changes saved");
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
          showConfirmation("Student deleted");
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
          const rows = data.rows_processed ?? "N/A";
          const inserted = data.inserted ?? "N/A";
          showConfirmation(`Bulk upload complete: ${rows} rows, ${inserted} added/updated`, 5000);
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
    showConfirmation("Export started");
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
    showConfirmation("Template downloaded");
  };

  // storage key used to persist selected student (use sessionStorage so it survives refresh in same tab)
  const STORAGE_KEY = "SDS:selectedStudent";

  const goToIncidentPage = (student) => {
    // normalize fields so IncidentPage can read them consistently
    const canonical = {
      ...student,
      // ensure canonical student_id field (some records use id, some student_id)
      student_id: student.student_id ?? student.id ?? "",
      // ensure email field under a single key
      email: (student.email ?? student.email_address ?? student.student_email ?? "").trim(),
    };

    // persist to sessionStorage so IncidentPage can restore on refresh
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
    } catch (err) {
      console.warn("Could not persist selected student:", err);
    }

    // navigate and pass via state for immediate availability
    // adjust "/incident" if your route path differs
    navigate("/incident", { state: { student: canonical } });
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

  // --- NEW: Restore persisted selected student on mount (if any) ---
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSelectedStudent(parsed);
        // populate incidents/counts for the restored student
        loadStudentIncidents(parsed);
      }
    } catch (err) {
      console.warn("Failed to restore selected student from sessionStorage:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // --- NEW: Persist selectedStudent whenever it changes ---
  useEffect(() => {
    try {
      if (selectedStudent) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedStudent));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn("Failed to persist selected student to sessionStorage:", err);
    }
  }, [selectedStudent]);

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
  const renderFields = (level, student = {}, options = { includeId: true }) => {
    const includeId = options.includeId !== false;
    const onGradeChange = options.onGradeChange; // optional handler passed by caller

    // helper: case-insensitive match for level keywords in 'type' fields
    const isTypeMatch = (typeValue, keyword) => {
      if (!typeValue && typeValue !== "") return false;
      return String(typeValue).toLowerCase().includes(keyword.toLowerCase());
    };

    // derive filtered lists based on level
    const juniorKeyword = "junior";
    const seniorKeyword = "senior";

    // if grade objects include a 'type' property, filter them by level; otherwise fallback to full list
    const juniorGrades = grades && grades.length
      ? grades.filter((g) => isTypeMatch(g.type ?? g.category ?? "", juniorKeyword))
      : grades;

    const seniorGrades = grades && grades.length
      ? grades.filter((g) => isTypeMatch(g.type ?? g.category ?? "", seniorKeyword))
      : grades;

    // sections: filter by section.type (SectionPage shows sections have a 'type' field)
    const juniorSections = sections && sections.length
      ? sections.filter((s) => isTypeMatch(s.type ?? s.category ?? "", juniorKeyword))
      : sections;

    const seniorSections = sections && sections.length
      ? sections.filter((s) => isTypeMatch(s.type ?? s.category ?? "", seniorKeyword))
      : sections;

    // Determine current grade for filtering sections:
    // prefer explicit grade on the student (edit/view), otherwise use the add-form grade state
    const currentGrade = (student && student.grade) ? student.grade : addFormGrade || "";

    switch (level) {
      case "junior":
        return (
          <>
            {includeId && (
              <>
                <label>
                  ID<span className="required">*</span>
                </label>
                <input name="id" defaultValue={student.student_id ?? student.id} required />
              </>
            )}

            <label>
              Grade<span className="required">*</span>
            </label>
            <select
              name="grade"
              defaultValue={student.grade}
              required
              onChange={(e) => {
                // notify caller (Add modal passes a handler) so sections filter live
                if (typeof onGradeChange === "function") onGradeChange(e.target.value);
                // also update local addFormGrade as a fallback
                setAddFormGrade(e.target.value);
              }}
            >
              <option value="">Select Grade</option>
              {(Array.isArray(juniorGrades) && juniorGrades.length ? juniorGrades : grades).map((g) => (
                <option key={g.id ?? g.grade} value={g.grade ?? g.name ?? g.id}>
                  {g.grade ?? g.name ?? g.id}
                </option>
              ))}
            </select>

            <label>
              Section<span className="required">*</span>
            </label>
            <select name="section" defaultValue={student.section} required>
              <option value="">Select Section</option>
              {(Array.isArray(juniorSections) && juniorSections.length ? juniorSections : sections)
                .filter((s) => matchesSectionToGrade(s, currentGrade))
                .map((s) => (
                  <option key={s.id ?? s.section} value={s.section ?? s.name ?? s.id}>
                    {s.section ?? s.name ?? s.id}
                  </option>
                ))}
            </select>
          </>
        );

      case "senior":
        // helper to detect sections meant for senior high (type/category/name may contain clues)
        const isSeniorSection = (s) => {
          if (!s) return false;
          const combined = [s.type, s.category, s.title, s.section, s.name]
            .filter(Boolean)
            .join(" ")
            .toString()
            .toLowerCase();
          // match common senior indicators and also explicit Grade 11/12 mentions
          return combined.includes("senior") || combined.includes("senior high") || combined.includes("grade 11") || combined.includes("grade 12") || combined.includes("11") || combined.includes("12");
        };

        return (
          <>
            {includeId && (
              <>
                <label>
                  ID<span className="required">*</span>
                </label>
                <input name="id" defaultValue={student.student_id ?? student.id} required />
              </>
            )}

            <label>
              Grade<span className="required">*</span>
            </label>
            <select
              name="grade"
              defaultValue={student.grade}
              required
              onChange={(e) => {
                if (typeof onGradeChange === "function") onGradeChange(e.target.value);
                setAddFormGrade(e.target.value);
              }}
            >
              <option value="">Select Grade</option>
              {(Array.isArray(seniorGrades) && seniorGrades.length ? seniorGrades : grades).map((g) => (
                <option key={g.id ?? g.grade} value={g.grade ?? g.name ?? g.id}>
                  {g.grade ?? g.name ?? g.id}
                </option>
              ))}
            </select>

            {/* Section for Senior (placed below Grade as requested) */}
            <label>
              Section<span className="required">*</span>
            </label>
            <select name="section" defaultValue={student.section} required>
              <option value="">Select Section</option>
              {(Array.isArray(seniorSections) && seniorSections.length ? seniorSections : sections)
                .filter((s) => {
                  // include section if it explicitly matches the selected grade (e.g., "Grade 11")
                  // OR if the section text/type indicates it's a senior-high section
                  return matchesSectionToGrade(s, currentGrade) || isSeniorSection(s);
                })
                .map((s) => (
                  <option key={s.id ?? s.section} value={s.section ?? s.name ?? s.id}>
                    {s.section ?? s.name ?? s.id}
                  </option>
                ))}
            </select>

            <label>
              Strand<span className="required">*</span>
            </label>
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
            {includeId && (
              <>
                <label>
                  ID<span className="required">*</span>
                </label>
                <input name="id" defaultValue={student.student_id ?? student.id} required />
              </>
            )}

            <label>
              Department<span className="required">*</span>
            </label>
            <select name="department" defaultValue={student.department} required>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.department ?? d.name ?? ""}>
                  {d.department ?? d.name ?? ""}
                </option>
              ))}
            </select>

            <label>
              Year<span className="required">*</span>
            </label>
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

  // Replace the existing matchesSectionToGrade function with this
  const matchesSectionToGrade = (sectionObj, gradeValue) => {
    if (!gradeValue) return true; // no filter -> all allowed
    const gradeRaw = String(gradeValue).toLowerCase().trim();

    // normalize helper: extract digits from grade string (e.g., "7", "7th", "grade 7", "1st year" -> 7 or 1)
    const digitsFrom = (s) => {
      if (!s) return "";
      const m = String(s).match(/\d+/);
      return m ? m[0] : "";
    };

    const gradeDigits = digitsFrom(gradeRaw);

    // if sectionObj is a string, compare text
    const sectionTextCandidates = [];
    if (!sectionObj) return true;
    if (typeof sectionObj === "string") sectionTextCandidates.push(sectionObj);
    // include fields that may contain grade text: section/name/title/type/category
    if (sectionObj.section) sectionTextCandidates.push(sectionObj.section);
    if (sectionObj.name) sectionTextCandidates.push(sectionObj.name);
    if (sectionObj.title) sectionTextCandidates.push(sectionObj.title);
    if (sectionObj.type) sectionTextCandidates.push(sectionObj.type);
    if (sectionObj.category) sectionTextCandidates.push(sectionObj.category);

    // check explicit 'grade' or 'grades' fields on section object
    if (sectionObj.grade) {
      if (String(sectionObj.grade).toLowerCase().trim() === gradeRaw) return true;
      if (digitsFrom(sectionObj.grade) && digitsFrom(sectionObj.grade) === gradeDigits) return true;
    }
    if (Array.isArray(sectionObj.grades) && sectionObj.grades.length) {
      if (sectionObj.grades.some((g) => String(g).toLowerCase().trim() === gradeRaw)) return true;
      if (sectionObj.grades.some((g) => digitsFrom(g) && digitsFrom(g) === gradeDigits)) return true;
    }

    // fallback: check text includes whole normalized grade or digits
    for (const t of sectionTextCandidates) {
      if (!t) continue;
      const tl = String(t).toLowerCase();
      if (tl.includes(gradeRaw)) return true;
      if (gradeDigits && tl.includes(gradeDigits)) return true;
    }

    // nothing matched -> do not include
    return false;
  };

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
            maxWidth: 420,
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
              color: "rgba(255,255,255,0.95)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="dashboard-header-bar">
        <h1 className="dashboard-title">Student Management</h1>
        <div className="user-account">
          <img src="/RCCLOGO.png" alt="Rcc Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
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
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
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
          <div className="modal-box add-modal">
            <div className="modal-header">
              <h3>Add Student</h3>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="modal-body">

                {/* Moved ID above Name for Add modal */}
                <label>
                  ID<span className="required">*</span>
                </label>
                <input name="id" required />

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

                {renderFields(selectedLevel, {}, { includeId: false, onGradeChange: (v) => setAddFormGrade(v) })}

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