import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "./IncidentPage.css";
/*
  IncidentPage.jsx
  - Shows Violation Entry and Incident table.
  - When navigated with a student (location.state.student) the form is populated and
    the table is scoped to that student.
  - Selection is persisted to sessionStorage (key "SDS:selectedStudent") so refresh
    keeps the selected student and the Violation Entry populated.
  - Clicking another student's Configure/View updates the selection immediately.
  - Auto-computes next offense for a student (auto-assigns Minor/1st, Minor/2nd, or escalates to Major)
  - If user selects Major, offense is automatically set to "Major" and dropdown removed.
*/

function IncidentPage({ user }) {
  const API_BASE = "http://localhost/SDSUpdate1-main/backend/Incident.php";
  const BACKEND_BASE = "http://localhost/SDSUpdate1-main/backend";
  const STORAGE_KEY = "SDS:selectedStudent";

  const location = useLocation();

  // state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [violations, setViolations] = useState([]);
  const [violationOptions, setViolationOptions] = useState([]);
  const [sanctionOptions, setSanctionOptions] = useState([]);
  const [strandOptions, setStrandOptions] = useState([]);

  // New: map id/value -> human label for resolving stored ids (and for showing readable values)
  const [violationLookup, setViolationLookup] = useState({});

  // track if form values were auto-assigned or manually overridden
  const [autoAssigned, setAutoAssigned] = useState(true);

  const [formData, setFormData] = useState({
    type: "",
    sanction: "",
    violation: "",
    offense: "1st",
  });

  const [modal, setModal] = useState({ open: false, title: "", content: null, pos: null, noHeader: false });
  const [menuOpenIndex, setMenuOpenIndex] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({
    alpha: null,
    department: "",
    grade: "",
    section: "",
    violation: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const exportBtnRef = useRef(null);

  // Small notification toast shown when mail client is opened
  const [notifyToast, setNotifyToast] = useState({ visible: false, message: "" });
  const notifyTimeoutRef = useRef(null);

  // helper to canonicalize student id
  const getCanonicalStudentId = (obj) => {
    if (!obj) return "";
    return obj.student_id ?? obj.studentId ?? obj.id ?? "";
  };

  // helper: display value or "NA" when empty/null/whitespace
  const displayOrNA = (value) => {
    if (value === undefined || value === null) return "N/A";
    const s = String(value).trim();
    return s === "" ? "N/A" : s;
  };

  // resolve violation label (handles numeric ids by using the lookup)
  const resolveViolationLabel = (val) => {
    if (val === undefined || val === null) return "";
    const s = String(val);
    if (violationLookup && violationLookup[s]) return violationLookup[s];
    // fallback: return the original string (so existing label values remain)
    return s;
  };

  // --- Notification helpers (automatic mailto) ---
  // Try to find a sensible email address on the incident/student record.
  const extractEmailFromRecord = (rec) => {
    if (!rec) return "";
    const keys = [
      "email",
      "parent_email",
      "guardian_email",
      "parentEmail",
      "guardianEmail",
      "email_address",
      "guardianEmailAddress",
      "contact_email",
      "contact",
    ];
    for (const k of keys) {
      if (rec[k]) {
        // prefer the first non-empty string
        const v = String(rec[k]).trim();
        if (v) return v;
      }
    }
    // nested parent/guardian object patterns
    if (rec.parent && (rec.parent.email || rec.parent.email_address)) return rec.parent.email || rec.parent.email_address;
    if (rec.guardian && (rec.guardian.email || rec.guardian.email_address)) return rec.guardian.email || rec.guardian.email_address;
    return "";
  };

  const composeNotificationEmail = (row) => {
    const name = row.name || row.student_name || "Student";
    const sid = getCanonicalStudentId(row) || "";
    const type = row.type || row.violation_type || "—";
    const offense = row.offense || "—";
    const violationLabel = resolveViolationLabel(row.violation || row.violation_description || "");
    const sanction = row.sanction || "—";
    const date = new Date();
    const dateStr = date.toLocaleDateString();
    const subject = `Incident Notification — ${name}${sid ? ` (${sid})` : ""}`;

    const bodyLines = [
      `Dear Parent/Guardian,`,
      ``,
      `This is to inform you that an incident involving your child, ${name}${sid ? ` (Student ID: ${sid})` : ""}, was recorded on ${dateStr}. Below are the details:`,
      ``,
      `Types of Violation: ${displayOrNA(type)}`,
      `Violation: ${displayOrNA(violationLabel)}`,
      `Sanction: ${displayOrNA(sanction)}`,
      `Number of Offense: ${displayOrNA(offense)}`,
      ``,
      `We request your cooperation in addressing this matter. Please contact the school office or the guidance counselor to discuss the incident or to schedule a meeting if needed.`,
      ``,
      `Sincerely,`,
      `${user?.username || user?.email || "School Discipline Office"}`,
    ];

    const body = bodyLines.join("\r\n");
    return { subject, body };
  };

  // Show the small notification toast
  const showNotifyToast = (message, duration = 3000) => {
    try {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
        notifyTimeoutRef.current = null;
      }
      setNotifyToast({ visible: true, message });
      notifyTimeoutRef.current = setTimeout(() => {
        setNotifyToast({ visible: false, message: "" });
        notifyTimeoutRef.current = null;
      }, duration);
    } catch (err) {
      // ignore
    }
  };

  // Open the user's default mail client with prefilled subject & body.
  // If no recipient email was found, the mailto will open with no "to" so the sender can address it.
  const sendNotificationEmail = (row) => {
    try {
      const to = extractEmailFromRecord(row) || "";
      const { subject, body } = composeNotificationEmail(row);
      // Note: don't encode recipient (mailto expects a normal address), but encode subject/body.
      const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Use location change so mobile/desktop mail clients open reliably
      window.location.href = mailto;

      // Show toast confirming we opened the mail client
      if (to) {
        showNotifyToast(`Mail client opened for ${to}`);
      } else {
        showNotifyToast("Mail client opened — please add recipient");
      }
    } catch (err) {
      // Fallback: if something fails, open mail client with subject/body only
      const { subject, body } = composeNotificationEmail(row);
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showNotifyToast("Mail client opened");
    }
  };
  // --- end notification helpers ---

  // cleanup notify timeout on unmount
  useEffect(() => {
    return () => {
      if (notifyTimeoutRef.current) {
        clearTimeout(notifyTimeoutRef.current);
        notifyTimeoutRef.current = null;
      }
    };
  }, []);

  // restore selection from navigation or sessionStorage
  useEffect(() => {
    try {
      if (location && location.state && location.state.student) {
        setSelectedStudent(location.state.student);
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location.state.student));
        } catch {}
      } else {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setSelectedStudent(parsed);
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to restore selectedStudent in IncidentPage:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // persist selection to sessionStorage
  useEffect(() => {
    try {
      if (selectedStudent) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selectedStudent));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn("Failed to persist selected student to sessionStorage:", err);
    }
  }, [selectedStudent]);

  // load incidents and strands on mount
  useEffect(() => {
    fetchIncidents();

    fetch(`${BACKEND_BASE}/Strand.php`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStrandOptions(data);
        else setStrandOptions(data?.data ?? []);
      })
      .catch(() => setStrandOptions([]));

    // Fetch all violation definitions to build a lookup (id/value -> label).
    // This lets us display labels for incidents that store a numeric id.
    fetch(`${BACKEND_BASE}/Violation.php`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data?.data ?? []);
        const map = {};
        arr.forEach((o) => {
          if (o === null || o === undefined) return;
          // determine a readable label
          const label = o.name ?? o.value ?? o.violation ?? o.label ?? String(o);
          // choose keys that may be used as stored value: id, value, name, label
          if (o.id !== undefined && o.id !== null) map[String(o.id)] = label;
          if (o.value !== undefined && o.value !== null) map[String(o.value)] = label;
          if (o.name !== undefined && o.name !== null) map[String(o.name)] = label;
          // also map the label itself to label so label values remain readable
          map[String(label)] = label;
        });
        setViolationLookup(map);
      })
      .catch(() => {
        // ignore - lookup remains empty
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setViolations(rows);
    } catch (err) {
      console.error("Failed to fetch incidents:", err);
      setViolations([]);
    }
  };

  const createIncident = async (payload) => {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: true, message: "No JSON returned" }));
      fetchIncidents();
      return data;
    } catch (err) {
      console.error("Create incident error:", err);
      return { success: false, message: String(err) };
    }
  };

  const updateIncident = async (payload) => {
    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({ success: true, message: "No JSON returned" }));
      fetchIncidents();
      return data;
    } catch (err) {
      console.error("Update incident error:", err);
      return { success: false, message: String(err) };
    }
  };

  const deleteIncident = async (id) => {
    try {
      // Send JSON body with id because backend reads php://input JSON for DELETE
      const res = await fetch(API_BASE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({ success: true, message: "No JSON returned" }));
      // refresh the list after deletion
      fetchIncidents();
      return data;
    } catch (err) {
      console.error("Delete incident error:", err);
      return { success: false, message: String(err) };
    }
  };

  // compute next offense for a student given current incidents data
  const computeNextOffenseForStudent = (student) => {
    const sid = getCanonicalStudentId(student);
    // default
    if (!sid) return { type: "Minor", offense: "1st" };

    // count prior incidents for this student
    const prior = (Array.isArray(violations) ? violations : []).filter((v) => {
      const rid = getCanonicalStudentId(v);
      return String(rid) === String(sid);
    });

    // Count only prior MINOR occurrences (case-insensitive)
    const minorCount = prior.filter((v) => {
      const t = (v.type ?? v.violation_type ?? "").toString().toLowerCase();
      return t === "minor";
    }).length;

    if (minorCount === 0) return { type: "Minor", offense: "1st" };
    if (minorCount === 1) return { type: "Minor", offense: "2nd" };
    // 2 or more prior minors => escalate to Major
    return { type: "Major", offense: "Major" };
  };

  // fetch violations & sanctions for a given type
  const fetchViolationsAndSanctions = (typeValue) => {
    setViolationOptions([]);
    setSanctionOptions([]);
    if (!typeValue) return;
    const urlBoth = `${API_BASE}?type=${encodeURIComponent(typeValue)}`;
    fetch(urlBoth)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setViolationOptions(data);
          setSanctionOptions([]);
        } else if (data && typeof data === "object") {
          const v = data.violations ?? data.violation ?? data.data ?? [];
          const s = data.sanctions ?? data.sanction ?? [];
          setViolationOptions(Array.isArray(v) ? v : []);
          setSanctionOptions(Array.isArray(s) ? s : []);
        } else {
          setViolationOptions([]);
          setSanctionOptions([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load violations/sanctions", err);
        setViolationOptions([]);
        setSanctionOptions([]);
      });
  };

  // Auto-assign next offense/type when student selection or incidents list changes,
  // unless the user manually overrode the Type (autoAssigned === false).
  useEffect(() => {
    if (!selectedStudent) return;
    const next = computeNextOffenseForStudent(selectedStudent);
    // If already matching formData and we previously autoAssigned, no-op
    const same = formData.type === next.type && formData.offense === next.offense;
    if (!autoAssigned && !same) {
      // user manually changed type/offense; do not override
      return;
    }
    // set autoAssigned state true and programmatically set the form
    setAutoAssigned(true);
    setFormData((p) => ({ ...p, type: next.type, offense: next.offense, violation: "", sanction: "" }));
    fetchViolationsAndSanctions(next.type);

    // if escalation occured, inform the user via modal
    if (next.type === "Major") {
      setModal({
        open: true,
        title: "Escalation to Major",
        content: (
          <div style={{ padding: 12 }}>
            <p>
              This student already has 2 or more prior Minor offenses. The next
              incident will be processed as a <strong>Major</strong> offense.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>OK</button>
            </div>
          </div>
        ),
        pos: null,
        noHeader: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, violations]);

  // change handler: updates formData and fetches violation/sanction lists when type changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    // if the type changed we may auto-compute offense when Minor selected,
    // but this change is coming from the user, so mark autoAssigned = false
    if (name === "type") {
      setAutoAssigned(false); // user manually picked a type

      if (value === "Minor") {
        // if user explicitly chose Minor, compute next offense based on data
        const next = computeNextOffenseForStudent(selectedStudent);
        if (next.type === "Major") {
          // user chose Minor but business rule says escalate; we'll honor escalation automatically
          setFormData((p) => ({ ...p, type: "Major", offense: "Major", violation: "", sanction: "" }));
          fetchViolationsAndSanctions("Major");
          setModal({
            open: true,
            title: "Escalation to Major",
            content: (
              <div style={{ padding: 12 }}>
                <p>
                  This student already has 2 or more prior Minor offenses. The next
                  incident will be processed as a <strong>Major</strong> offense.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>OK</button>
                </div>
              </div>
            ),
            pos: null,
            noHeader: false,
          });
        } else {
          setFormData((p) => ({ ...p, type: "Minor", offense: next.offense, violation: "", sanction: "" }));
          fetchViolationsAndSanctions("Minor");
        }
        return;
      }

      if (value === "Major") {
        // If the user explicitly selects Major, auto-set offense to Major and fetch Major lists
        setFormData((p) => ({ ...p, type: "Major", offense: "Major", violation: "", sanction: "" }));
        fetchViolationsAndSanctions("Major");
        return;
      }

      // not Minor/ Major (empty or other): regular behavior, set and fetch
      setFormData((p) => ({ ...p, [name]: value, violation: "", sanction: "" }));
      fetchViolationsAndSanctions(value);
      return;
    }

    // other fields normal handling
    setFormData((p) => ({ ...p, [name]: value }));
  };

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
      strand: selectedStudent.strand,
      type: formData.type,
      offense: formData.offense,
      violation: formData.violation,
      sanction: formData.sanction,
    };

    const result = await createIncident(payload);
    if (result.success) {
      // after saving, we want next incident to be auto-computed again
      setAutoAssigned(true);
      setFormData({ type: "", sanction: "", violation: "", offense: "1st" });
      setModal({
        open: true,
        title: "Success",
        content: <div style={{ padding: 12 }}><p>Violation saved for {selectedStudent.name}.</p></div>,
        pos: null,
        noHeader: false,
      });
    } else {
      alert("Failed to save incident: " + (result.message || "unknown"));
    }
  };

  const handleConfigure = (student) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(student));
    } catch {}
    setSelectedStudent(student);
    // allow auto-assignment when a new student is configured
    setAutoAssigned(true);
  };

  // Bulk upload support (kept simple)
  const parseCsvLine = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const parseCsvText = (text) => {
    if (!text) return [];
    const rawLines = text.split(/\r\n|\n|\r/);
    let idx = 0;
    while (idx < rawLines.length && rawLines[idx].trim() === "") idx++;
    if (idx >= rawLines.length) return [];
    const headers = parseCsvLine(rawLines[idx]).map((h) => (h || "").trim());
    const rows = [];
    for (let i = idx + 1; i < rawLines.length; i++) {
      const row = rawLines[i];
      if (row.trim() === "") {
        rows.push({});
        continue;
      }
      const values = parseCsvLine(row);
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j] || `col${j}`] = values[j] ?? "";
      }
      rows.push(obj);
    }
    return rows;
  };

  const mapRowToIncidentPayload = (row) => {
    const pick = (...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
      }
      return "";
    };

    const studentId = pick("student_id", "id", "studentid", "student id", "student-id");
    const name = pick("name", "student_name", "fullname", "full_name");
    const department = pick("department", "dept", "college");
    const grade = pick("grade", "year", "level");
    const year = pick("year", "grade");
    const section = pick("section", "sec", "section_name");
    const strand = pick("strand", "track");
    const type = pick("type", "violation_type", "violation type") || "Minor";
    const offense = pick("offense", "offence", "offense_number") || "1st";
    const violation = pick("violation", "violation_description", "description");
    const sanction = pick("sanction", "sanctions");

    return {
      student_id: studentId || undefined,
      name: name || undefined,
      department: department || undefined,
      grade: grade || undefined,
      year: year || undefined,
      section: section || undefined,
      strand: strand || undefined,
      type: type || undefined,
      offense: offense || undefined,
      violation: violation || undefined,
      sanction: sanction || undefined,
    };
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    event.target.value = "";

    if (!file.type.includes("csv") && !file.type.includes("text")) {
      alert("Please provide a CSV/text file");
      return;
    }

    let text = "";
    try {
      text = await file.text();
    } catch (err) {
      alert("Failed to read file");
      return;
    }

    const rows = parseCsvText(text);
    if (!rows || rows.length === 0) {
      alert("No rows found in CSV");
      return;
    }

    const failures = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRowToIncidentPayload(rows[i]);
      const payload = {
        student_id: mapped.student_id,
        name: mapped.name,
        department: mapped.department,
        grade: mapped.grade,
        year: mapped.year,
        section: mapped.section,
        strand: mapped.strand,
        type: mapped.type,
        offense: mapped.offense,
        violation: mapped.violation,
        sanction: mapped.sanction,
      };

      if (!payload.violation || !(payload.student_id || payload.name)) {
        failures.push({ row: i + 1, rowData: payload, error: "Missing required fields" });
        continue;
      }

      try {
        const res = await createIncident(payload);
        if (!res || !res.success) {
          failures.push({ row: i + 1, rowData: payload, error: (res && (res.error || res.message)) || "Failed" });
        } else {
          successCount++;
        }
      } catch (err) {
        failures.push({ row: i + 1, rowData: payload, error: String(err) });
      }
    }

    setModal({
      open: true,
      title: "Bulk Upload - Results",
      content: (
        <div style={{ padding: 12, maxHeight: 420, overflowY: "auto" }}>
          <p>Finished. {successCount} succeeded, {failures.length} failed out of {rows.length}.</p>
          {failures.length > 0 && (
            <>
              <div style={{ marginTop: 8 }}>
                <strong>Failures (first 10 shown):</strong>
                <ol>
                  {failures.slice(0, 10).map((f, idx) => (
                    <li key={idx}>
                      Row {f.row}: {f.error}
                      <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>
                        {Object.keys(f.rowData || {}).length ? JSON.stringify(f.rowData) : null}
                      </div>
                    </li>
                  ))}
                </ol>
                {failures.length > 10 && <div>...and {failures.length - 10} more</div>}
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>Close</button>
            <button onClick={() => { fetchIncidents(); setModal({ open: false, title: "", content: null, pos: null, noHeader: false }); }}>Refresh List</button>
          </div>
        </div>
      ),
      pos: null,
      noHeader: false,
    });
  };

  // export
  const handleExport = () => {
    const headers = ["Student ID", "Name", "Department", "Year", "Section", "Violation"];
    const rows = violations.map((v) => [
      v.student_id || v.id,
      v.name,
      v.department || v.dept,
      v.year,
      v.section,
      resolveViolationLabel(v.violation),
    ]);
    const tableData = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([tableData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident_records.csv";
    a.click();
  };

  const handleDownloadTemplate = () => {
    const csv = "ID,Name,Dept.,Year,Section,Violation\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "incident_template.csv";
    a.click();
  };

  const filteredViolations = (() => {
    let list = Array.isArray(violations) ? [...violations] : [];

    if (selectedStudent) {
      const sid = getCanonicalStudentId(selectedStudent);
      if (sid !== null && sid !== undefined && String(sid).trim() !== "") {
        list = list.filter((r) => {
          const rid = getCanonicalStudentId(r);
          return String(rid) === String(sid);
        });
      }
    }

    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter((v) => {
        const name = (v.name || "").toString().toLowerCase();
        const sid = (v.student_id || v.id || "").toString().toLowerCase();
        const violation = (v.violation || "").toString().toLowerCase();
        return name.includes(q) || sid.includes(q) || violation.includes(q);
      });
    }

    if (appliedFilters.department) {
      const df = String(appliedFilters.department).toLowerCase();
      list = list.filter((v) => (String(v.department ?? v.dept ?? "").toLowerCase() === df));
    }

    if (appliedFilters.grade) {
      const gf = String(appliedFilters.grade).toLowerCase();
      list = list.filter((v) => {
        const g = String(v.grade ?? v.year ?? v.level ?? "").toLowerCase();
        return g === gf;
      });
    }

    if (appliedFilters.section) {
      const sf = String(appliedFilters.section).toLowerCase();
      list = list.filter((v) => String(v.section ?? v.sec ?? v.section_name ?? v.sectionName ?? "").toLowerCase() === sf);
    }

    if (appliedFilters.violation) {
      const vf = String(appliedFilters.violation).toLowerCase();
      list = list.filter((v) => String(v.violation ?? "").toLowerCase() === vf);
    }

    if (appliedFilters.alpha === "asc") {
      list.sort((a, b) => String(a.name || a.violation || "").localeCompare(String(b.name || b.violation || "")));
    } else if (appliedFilters.alpha === "desc") {
      list.sort((a, b) => String(b.name || b.violation || "").localeCompare(String(a.name || a.violation || "")));
    }

    return list;
  })();

  // Action menu handler (simplified)
  const handleMenuAction = (action, row) => {
    switch (action) {
      case "View Student Profile":
        // Use the new StudentProfileModal for a modern profile view
        setModal({
          open: true,
          title: "",
          noHeader: true,
          pos: null,
          content: (
            <StudentProfileModal
              student={row}
              onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
            />
          ),
        });
        break;
      case "Edit Violation":
        setModal({
          open: true,
          title: "Edit Violation",
          // pass an onSave that returns the updateIncident result
          content: (
            <EditIncidentForm
              initial={row}
              onSave={async (payload) => {
                const res = await updateIncident(payload);
                return res;
              }}
              onCancel={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}
            />
          ),
          pos: null,
          noHeader: false,
        });
        break;
      case "Delete":
        if (window.confirm("Delete this incident?")) {
          (async () => {
            const id = row.id ?? row.incident_id ?? row.incidentId;
            const result = await deleteIncident(id);
            if (result && result.success) {
              setModal({
                open: true,
                title: "Deleted",
                content: (
                  <div style={{ padding: 12 }}>
                    <p>Incident deleted successfully.</p>
                  </div>
                ),
                pos: null,
                noHeader: false,
              });
            } else {
              const errMsg = result && (result.message || result.error) ? (result.message || result.error) : "Failed to delete incident.";
              alert("Delete failed: " + errMsg);
            }
          })();
        }
        break;
      case "Process":
        setModal({
          open: true,
          title: "Major Offense",
          content: <MajorOffenseModal step={1} student={row} savedData={{}} onSave={async () => { /* not fully implemented here */ }} onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })} />,
          pos: null,
          noHeader: false,
        });
        break;
      case "Send Notification":
        // Automatic send: open the user's mail client immediately with a professional email
        sendNotificationEmail(row);
        // close the action modal so the mail client opens with focus
        setModal({ open: false, title: "", content: null, pos: null, noHeader: false });
        break;
      default:
        setModal({ open: true, title: action, content: <p>Unknown action</p>, pos: null, noHeader: false });
    }

    setMenuOpenIndex(null);
  };

  return (
    <div className="incident-container">
      {/* Small notify toast */}
      {notifyToast.visible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1100,
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
          <div style={{ flex: 1, fontSize: 14 }}>{notifyToast.message}</div>
          <button
            onClick={() => {
              if (notifyTimeoutRef.current) {
                clearTimeout(notifyTimeoutRef.current);
                notifyTimeoutRef.current = null;
              }
              setNotifyToast({ visible: false, message: "" });
            }}
            aria-label="Close notification"
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
      <div className="incident-header-bar">
        <h1 className="incident-title">Student Management ▸ Incident Management</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">{user?.username || user?.email || user?.role || "User"}</span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      {/* Violation Entry */}
      <div className="violation-entry">
        <h3>Violation Entry</h3>

        {/* Row 1: Name - Student ID - Department - Grade */}
        <div className="form-grid">
          <div>
            <label>Name of Student</label>
            <input type="text" value={displayOrNA(selectedStudent?.name)} readOnly />
          </div>

          <div>
            <label>Student ID</label>
            <input type="text" value={displayOrNA(getCanonicalStudentId(selectedStudent))} readOnly />
          </div>

          <div>
            <label>Department</label>
            <input type="text" value={displayOrNA(selectedStudent?.department ?? selectedStudent?.dept)} readOnly />
          </div>

          <div>
            <label>Grade</label>
            <input type="text" value={displayOrNA(selectedStudent?.grade ?? selectedStudent?.level)} readOnly />
          </div>
        </div>

        {/* Row 2: Year - Strand - Section - Number of Offense (auto when Minor or Major) */}
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div>
            <label>Year</label>
            <input type="text" value={displayOrNA(selectedStudent?.year)} readOnly />
          </div>

          <div>
            <label>Strand</label>
            <input type="text" value={displayOrNA(selectedStudent?.strand)} readOnly />
          </div>

          <div>
            <label>Section</label>
            <input type="text" value={displayOrNA(selectedStudent?.section)} readOnly />
          </div>

          <div>
            <label>Number of Offense</label>
            {/* Show read-only assigned offense when Type is Minor or Major; otherwise allow manual select */}
            {formData.type === "Minor" || formData.type === "Major" ? (
              <input type="text" value={displayOrNA(formData.offense)} readOnly />
            ) : (
              <div className="select-wrap">
                <select name="offense" value={formData.offense} onChange={handleChange}>
                  <option value="Select">Select</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="Major">Major</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Types of Violation - Violation - Sanction - Add button */}
        <div className="form-grid" style={{ marginTop: 12, alignItems: "end" }}>
          <div>
            <label>Types of Violation</label>
            <div className="select-wrap">
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="">Select Violation</option>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
              </select>
            </div>
          </div>

          <div>
            <label>Violation</label>
            <div className="select-wrap">
              <select name="violation" value={formData.violation} onChange={handleChange} disabled={!formData.type}>
                <option value="">Select</option>
                {violationOptions.length > 0 ? violationOptions.map((opt, idx) => {
                  if (opt === null || opt === undefined) return null;
                  if (typeof opt === "string" || typeof opt === "number") {
                    const v = String(opt);
                    return <option key={`${v}-${idx}`} value={v}>{v}</option>;
                  }
                  // prefer a readable label as the option value so the form stores the label
                  const label = opt.name ?? opt.value ?? opt.violation ?? opt.label ?? JSON.stringify(opt);
                  const value = String(label);
                  return <option key={`${value}-${idx}`} value={value}>{label}</option>;
                }) : (
                  <>
                    <option value="No Uniform">No Uniform</option>
                    <option value="Cheating">Cheating</option>
                    <option value="Disrespect">Disrespect</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div>
            <label>Sanction</label>
            <div className="select-wrap">
              <select name="sanction" value={formData.sanction} onChange={handleChange} disabled={!formData.type}>
                <option value="">Select Sanction</option>
                {sanctionOptions.length > 0 ? sanctionOptions.map((opt, idx) => {
                  if (opt === null || opt === undefined) return null;
                  if (typeof opt === "string" || typeof opt === "number") {
                    const v = String(opt);
                    return <option key={`${v}-${idx}`} value={v}>{v}</option>;
                  }
                  const label = opt.name ?? opt.value ?? opt.sanction ?? opt.label ?? JSON.stringify(opt);
                  const value = String(label);
                  return <option key={`${value}-${idx}`} value={value}>{label}</option>;
                }) : (
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
          </div>

          <div>
            <label style={{ visibility: "hidden" }}>Add</label>
            <button type="button" className="add-btn" onClick={handleAddViolation}>Add</button>
          </div>
        </div>
      </div>

      {/* Table Header Controls */}
      <div className="table-controls">
        <input className="search-input" type="text" placeholder="Search by name, id, violation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />

        <div className="controls-right">
          <button className="bulk-upload" onClick={() => document.getElementById("bulkUploadInput").click()}>Bulk Upload</button>
          <input type="file" id="bulkUploadInput" style={{ display: "none" }} onChange={handleBulkUpload} />

          <button ref={exportBtnRef} className="export-btn" onClick={handleExport}>Export</button>

          <button className="filter-btn" onClick={(e) => {
            const anchor = e.currentTarget;
            const openPopover = (pos) => {
              setModal({
                open: true,
                title: "",
                noHeader: true,
                pos,
                content: <FilterPopover onApply={(filters) => { setAppliedFilters(filters); setModal({ open: false, title: "", content: null, pos: null, noHeader: false }); }} onClose={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })} />,
              });
            };
            const rect = anchor.getBoundingClientRect();
            const popoverWidth = 360;
            const popoverHeight = 420;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            let left = rect.right - popoverWidth + scrollX;
            let top = rect.top + scrollY - popoverHeight - 8;
            if (top < 8) top = rect.bottom + scrollY + 8;
            if (left < 8 + scrollX) left = rect.left + scrollX;
            if (left + popoverWidth > vw - 8 + scrollX) left = Math.max(8 + scrollX, vw - popoverWidth - 8 + scrollX);
            if (top + popoverHeight > vh - 8 + scrollY) top = Math.max(8 + scrollY, vh - popoverHeight - 8 + scrollY);
            openPopover({ left, top });
          }}>Filter</button>
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
            const grade = v.grade ?? v.year ?? v.level ?? "";
            const section = v.section ?? v.sec ?? v.section_name ?? v.sectionName ?? "";
            const department = v.department ?? v.dept ?? "";
            // determine if this incident is Major (check common fields)
            const isMajor = String((v.type ?? v.violation_type ?? "")).toLowerCase() === "major";
            return (
              <tr key={index}>
                <td>{getCanonicalStudentId(v) || "-"}</td>
                <td>{v.name || "-"}</td>
                <td>{department || "-"}</td>
                <td>{grade || "-"}</td>
                <td>{section || "-"}</td>
                <td>{resolveViolationLabel(v.violation) || "-"}</td>
                <td>
                  <button className="menu-btn" onClick={() => {
                    setModal({
                      open: true,
                      title: (<div className="modal-header-flex"><span></span><span className="student-name-brown">{v.name}</span></div>),
                      noHeader: false,
                      pos: null,
                      content: (
                        <div className="action-modal-buttons">
                          <button onClick={() => handleMenuAction("View Student Profile", v)}>View Student Profile</button>
                          <button onClick={() => handleMenuAction("Edit Violation", v)}>Edit Violation</button>
                          {isMajor ? (
                            <button onClick={() => handleMenuAction("Process", v)}>Major Process</button>
                          ) : (
                            <button disabled title="Only available for Major offenses">Major Process</button>
                          )}
                          <button onClick={() => handleMenuAction("Send Notification", v)}>Send Notification</button>
                          <button onClick={() => handleMenuAction("Delete", v)}>Delete</button>
                        </div>
                      ),
                    });
                  }}>⋮</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal */}
      {modal.open && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal({ open: false, title: "", content: null, pos: null, noHeader: false }); }}>
          <div className={`modal-content ${modal.pos ? "popover" : ""}`} style={modal.pos ? { left: modal.pos.left + "px", top: modal.pos.top + "px" } : {}}>
            {!modal.noHeader && modal.title && <h2 className="modal-title">{modal.title}</h2>}
            {modal.content}
            {!modal.noHeader && (<div className="modal-actions"><button onClick={() => setModal({ open: false, title: "", content: null, pos: null, noHeader: false })}>Close</button></div>)}
          </div>
        </div>
      )}

      {/* Download Template */}
      <div className="download-template">
        <button onClick={handleDownloadTemplate}>Download Template</button>
      </div>
    </div>
  );
}

export default IncidentPage;

/* -------------------------
   StudentProfileModal - modern professional profile UI used for "View Student Profile"
   NOTE: This version intentionally does NOT render its own outer "card" chrome.
         It returns a single top-level container whose background is transparent so
         it renders as a single modal container inside the page-level modal wrapper.
   ------------------------- */
function StudentProfileModal({ student = {}, onClose = () => {} }) {
  // helper to safely read fields
  const get = (keys, fallback = "—") => {
    for (const k of keys) {
      if (student[k] !== undefined && student[k] !== null && String(student[k]).toString().trim() !== "") return student[k];
    }
    return fallback;
  };

  const createdAt = get(["created_at", "createdAt", "created", "date_created"], "—");
  const updatedAt = get(["updated_at", "updatedAt", "updated", "date_updated"], "—");

  // Top-level container intentionally minimal/transparent so the page modal
  // provides the outer box. Keep paddings for layout but avoid adding a separate card.
  const containerStyle = {
    width: 740,
    maxWidth: "calc(100vw - 30px)",
    borderRadius: 0,
    overflow: "visible",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    boxShadow: "none",
    background: "transparent",
    padding: 0,
  };

  const headerStyle = {
    display: "flex",
    gap: 12,
    padding: "18px 20px",
    alignItems: "center",
    borderBottom: "1px solid #eee",
    background: "transparent",
  };

  const avatarStyle = {
    width: 72,
    height: 72,
    borderRadius: 12,
    background: "#2d6cdf",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(45,108,223,0.12)",
  };

  const nameStyle = { fontSize: 18, fontWeight: 700, marginBottom: 4 };
  const subStyle = { fontSize: 13, color: "#6b7280" };

  const gridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16 };
  const fieldStyle = { display: "flex", flexDirection: "column", gap: 6 };

  const labelStyle = { fontSize: 12, color: "#9ca3af" };
  const valueStyle = { fontSize: 14, color: "#111827", fontWeight: 600 };

  const metaRowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderTop: "1px solid #f1f5f9", background: "transparent" };

  const initials = (student.name || "S").split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={avatarStyle}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{get(["name", "student_name"], "—")}</div>
          <div style={subStyle}>{get(["student_id", "id", "studentId"], "")}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Type</div>
          <div style={{ fontWeight: 700, color: (student.type && String(student.type).toLowerCase() === "major") ? "#b91c1c" : "#065f46" }}>{get(["type"], "—")}</div>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={fieldStyle}>
          <div style={labelStyle}>Department</div>
          <div style={valueStyle}>{get(["department", "dept"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Grade</div>
          <div style={valueStyle}>{get(["grade", "year", "level"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Year</div>
          <div style={valueStyle}>{get(["year", "grade"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Section</div>
          <div style={valueStyle}>{get(["section", "sec", "section_name"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Strand</div>
          <div style={valueStyle}>{get(["strand", "track"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Number of Offense</div>
          <div style={valueStyle}>{get(["offense"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Violation</div>
          <div style={valueStyle}>{get(["violation"], "—")}</div>
        </div>

        {/* NEW: show Email below Violation so sender can see the address used */}
        <div style={fieldStyle}>
          <div style={labelStyle}>Email</div>
          <div style={valueStyle}>{get(["email", "parent_email", "guardian_email"], "—")}</div>
        </div>

        <div style={fieldStyle}>
          <div style={labelStyle}>Sanction</div>
          <div style={valueStyle}>{get(["sanction"], "—")}</div>
        </div>
      </div>

      <div style={metaRowStyle}>
        <div style={{ fontSize: 13, color: "#374151" }}>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Created</div>
          <div style={{ fontWeight: 600 }}>{String(createdAt)}</div>
        </div>
        <div style={{ fontSize: 13, color: "#374151" }}>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Updated</div>
          <div style={{ fontWeight: 600 }}>{String(updatedAt)}</div>
        </div>
        <div style={{ marginLeft: 12 }}>
          <button onClick={onClose} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------
   EditIncidentForm - modern inline editor used by modals
   - onSave should return the backend response object (e.g. { success: true/false, message: "" })
   ------------------------- */
function EditIncidentForm({ initial = {}, onSave = async () => ({}), onCancel = () => {} }) {
  const [local, setLocal] = useState({ ...initial });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: "error"|"success", text: "" }

  useEffect(() => setLocal({ ...initial }), [initial]);

  const BACKEND_BASE = "http://localhost/SDSUpdate1-main/backend";
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [strands, setStrands] = useState([]);
  const [sections, setSections] = useState([]);
  const [violationOpts, setViolationOpts] = useState([]);
  const [sanctionOpts, setSanctionOpts] = useState([]);

  // New: gradeType derived from selected grade (null|'junior'|'senior')
  const [gradeType, setGradeType] = useState(null);

  useEffect(() => {
    const fetchList = async (url, setter) => {
      try {
        const res = await fetch(url);
        const d = await res.json();
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
        setter(arr);
      } catch (err) { setter([]); }
    };
    // load reference data for selects
    fetchList(`${BACKEND_BASE}/Department.php`, setDepartments);
    fetchList(`${BACKEND_BASE}/Grade.php`, setGrades);
    fetchList(`${BACKEND_BASE}/Strand.php`, setStrands);
    fetchList(`${BACKEND_BASE}/Section.php`, setSections);
    fetchList(`${BACKEND_BASE}/Violation.php`, setViolationOpts);
    // Sanctions endpoint may differ across your backend; follow existing pattern
    fetchList(`${BACKEND_BASE}/Sanction.php?action=read`, setSanctionOpts);
  }, []);

  // When local.grade changes compute gradeType ('junior' or 'senior')
  useEffect(() => {
    const determineGradeType = (g) => {
      if (!g) return null;
      const s = String(g);
      // try to find a number in the grade string
      const m = s.match(/\d+/);
      if (m) {
        const n = parseInt(m[0], 10);
        return n >= 11 ? "senior" : "junior";
      }
      // fallback: look for keywords
      const low = s.toLowerCase();
      if (low.includes("senior") || low.includes("sr") || low.includes("shs")) return "senior";
      if (low.includes("junior") || low.includes("jr") || low.includes("jhs")) return "junior";
      return null;
    };
    setGradeType(determineGradeType(local.grade));
  }, [local.grade]);

  // When type changes, refresh violation/sanction dropdowns (server-side attempt)
  useEffect(() => {
    if (!local.type) return;
    const q = `?action=read&type=${encodeURIComponent(local.type)}`;
    fetch(`${BACKEND_BASE}/Violation.php${q}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
        // still set whatever returned, client-side filtering will further narrow
        setViolationOpts(arr);
      })
      .catch(() => setViolationOpts([]));

    fetch(`${BACKEND_BASE}/Sanction.php${q}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : (d?.data ?? []);
        setSanctionOpts(arr);
      })
      .catch(() => setSanctionOpts([]));
  }, [local.type]);

  const handleChangeLocal = (key, value) => {
    setLocal((p) => ({ ...p, [key]: value }));
    setStatusMessage(null);
  };

  const handleSave = async () => {
    // validation
    if (!local.violation || !String(local.violation).trim()) {
      setStatusMessage({ type: "error", text: "Please select or enter a Violation." });
      return;
    }
    // normalize id field: backend may expect `id` or `incident_id`
    const payload = { ...local, id: local.id ?? local.incident_id ?? local.incidentId };

    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await onSave(payload);
      // treat undefined success as success (some endpoints return no JSON)
      const ok = res && (res.success === true || res.success === undefined);
      if (ok) {
        setStatusMessage({ type: "success", text: "Changes saved." });
        // small delay so user sees success, then close modal
        setTimeout(() => {
          setSaving(false);
          onCancel();
        }, 600);
      } else {
        const msg = (res && (res.message || res.error)) || "Save failed";
        setStatusMessage({ type: "error", text: String(msg) });
        setSaving(false);
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: String(err) });
      setSaving(false);
    }
  };

  // Helper: determine whether an option object matches the selected type.
  // Returns true when:
  // - no typeFilter provided (show all)
  // - item is primitive (we cannot infer type, so show it)
  // - item.type / item.violation_type / item.category equals the typeFilter (case-insensitive)
  const matchesType = (item, typeFilter) => {
    if (!typeFilter) return true;
    if (item === null || item === undefined) return false;
    if (typeof item === "string" || typeof item === "number") return true; // no way to filter, show it
    const t = (item.type ?? item.violation_type ?? item.violationType ?? item.category ?? "").toString();
    if (!t) return true; // item has no type metadata; show it
    return t.toLowerCase() === String(typeFilter).toLowerCase();
  };

  // New helper: determine whether section/strand item matches the selected grade type.
  // This looks for common metadata keys and also numeric ranges when present.
  const matchesGradeType = (item, gradeTypeFilter, gradeRaw) => {
    if (!gradeTypeFilter) return true;
    if (item === null || item === undefined) return false;
    if (typeof item === "string" || typeof item === "number") return true; // can't infer, show it

    // explicit booleans
    if (item.is_senior !== undefined) return !!item.is_senior === (gradeTypeFilter === "senior");
    if (item.isSenior !== undefined) return !!item.isSenior === (gradeTypeFilter === "senior");

    // explicit string tags: check several keys
    const tagProps = ["type", "grade_type", "school_level", "education_level", "category", "strand_type", "level", "for_level"];
    for (const k of tagProps) {
      if (item[k]) {
        const val = String(item[k]).toLowerCase();
        if (val.includes("senior") || val.includes("shs") || val.includes("sen")) return gradeTypeFilter === "senior";
        if (val.includes("junior") || val.includes("jhs") || val.includes("jun")) return gradeTypeFilter === "junior";
      }
    }

    // numeric min/max grade range
    const parseNum = (v) => {
      if (v === null || v === undefined) return null;
      const m = String(v).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    };
    const minG = parseNum(item.min_grade ?? item.minGrade ?? item.min);
    const maxG = parseNum(item.max_grade ?? item.maxGrade ?? item.max);
    const gradeNum = parseNum(gradeRaw);
    if (gradeNum !== null && (minG !== null || maxG !== null)) {
      const minOK = minG === null ? true : gradeNum >= minG;
      const maxOK = maxG === null ? true : gradeNum <= maxG;
      if (minG !== null || maxG !== null) {
        // if item's range exists, use it to determine senior/junior
        return minOK && maxOK && (gradeNum >= 11 ? gradeTypeFilter === "senior" : gradeTypeFilter === "junior");
      }
    }

    // If item has explicit grade-like property, try direct compare
    if (item.grade !== undefined) {
      const g = String(item.grade).toLowerCase();
      if (g.includes("grade") || g.match(/\d+/)) {
        if (gradeNum !== null) {
          const itemNum = parseNum(item.grade);
          if (itemNum !== null) return (itemNum >= 11) === (gradeTypeFilter === "senior");
        } else {
          if (g.includes("senior") || g.includes("jun")) return gradeTypeFilter === "senior";
        }
      }
    }

    // No clear metadata found — show the item by default to avoid hiding valid choices.
    return true;
  };

  // Robust renderOptions: always returns string children (no objects).
  // Accepts optional `typeFilter` to filter items by type (Minor/Major).
  // Accepts optional `gradeTypeFilter` + `gradeRaw` to filter strands/sections by grade type.
  const renderOptions = (list, typeFilter = "", gradeTypeFilter = null, gradeRaw = null) => {
    if (!list || list.length === 0) {
      return [<option key="__empty__" value="">No options</option>];
    }

    const options = list
      .filter((o) => {
        if (typeFilter && !matchesType(o, typeFilter)) return false;
        if (gradeTypeFilter && !matchesGradeType(o, gradeTypeFilter, gradeRaw)) return false;
        return true;
      })
      .map((o, idx) => {
        if (o === null || o === undefined) return null;

        // simple primitives
        if (typeof o === "string" || typeof o === "number") {
          const v = String(o);
          return <option key={`${v}-${idx}`} value={v}>{v}</option>;
        }

        // object: try common label/value fields (include section/strand keys)
        const label = (
          o.section ??
          o.section_name ??
          o.strand ??
          o.name ??
          o.label ??
          o.value ??
          o.violation ??
          o.sanction ??
          o.department ??
          o.grade ??
          o.department_name ??
          null
        );

        // Safer sequential assignment
        let value = null;
        if (o.id !== undefined && o.id !== null) value = o.id;
        else if (o.value !== undefined && o.value !== null) value = o.value;
        else if (o.name !== undefined && o.name !== null) value = o.name;
        else if (o.section !== undefined && o.section !== null) value = o.section;
        else if (o.strand !== undefined && o.strand !== null) value = o.strand;

        const finalLabel = label ?? (typeof o === "object" ? JSON.stringify(o) : String(o));
        const finalValue = (value !== null && value !== undefined) ? String(value) : finalLabel;

        return <option key={`${finalValue}-${idx}`} value={`${finalValue}`}>{finalLabel}</option>;
      })
      .filter(Boolean);

    return [<option key="__empty__" value="">Select</option>, ...options];
  };

  return (
    <div className="edit-incident-form modern-card">
      <div className="eif-header modern">
        <div className="eif-header-left">
          <div className="avatar modern">{(local.name || "—").split(" ").map(n => n[0] || "").slice(0,2).join("") || "S"}</div>
          <div className="eif-identity">
            <div className="eif-title">{local.name || "Edit Violation"}</div>
            <div className="eif-sub">{local.student_id ?? local.id ?? ""}</div>
          </div>
        </div>
        <div className="eif-header-right">
          <div className={`type-pill ${String(local.type || "").toLowerCase() === "major" ? "major" : "minor"}`}>{local.type || "Type: —"}</div>
        </div>
      </div>

      <div className="eif-grid modern-grid">
        <label className="eif-label"><span className="lbl">Student ID</span>
          <input className="eif-input" type="text" value={local.student_id ?? local.id ?? ""} readOnly />
        </label>

        <label className="eif-label"><span className="lbl">Type</span>
          <select className="eif-input" value={local.type || ""} onChange={(e) => handleChangeLocal("type", e.target.value)}>
            <option value="">Select</option><option value="Minor">Minor</option><option value="Major">Major</option>
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Number of Offense</span>
          <select className="eif-input" value={local.offense ?? ""} onChange={(e) => handleChangeLocal("offense", e.target.value)}>
            <option value="">Select</option><option value="1st">1st</option><option value="2nd">2nd</option><option value="Major">Major</option>
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Department</span>
          <select className="eif-input" value={local.department || local.dept || ""} onChange={(e) => handleChangeLocal("department", e.target.value)}>
            {renderOptions(departments.map(d => (typeof d === "string" ? { name: d } : d)))}
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Grade</span>
          <select className="eif-input" value={local.grade || ""} onChange={(e) => handleChangeLocal("grade", e.target.value)}>
            <option value="">Select</option>
            { (grades || []).map((g, i) => {
              const label = typeof g === "string" ? g : (g.grade ?? g.name ?? g.value ?? JSON.stringify(g));
              const value = label; // use readable label as the select value so grade-type detection works
              return <option key={`grade-${i}`} value={value}>{label}</option>;
            })}
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Year</span>
          <select className="eif-input" value={local.year || ""} onChange={(e) => handleChangeLocal("year", e.target.value)}>
            <option value="">Select</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Strand</span>
          {/* Pass gradeType so only appropriate strands appear */}
          <select className="eif-input" value={local.strand || ""} onChange={(e) => handleChangeLocal("strand", e.target.value)}>
            {renderOptions(strands, "", gradeType, local.grade)}
          </select>
        </label>

        <label className="eif-label"><span className="lbl">Section</span>
          {/* Pass gradeType so only appropriate sections appear */}
          <select className="eif-input" value={local.section || ""} onChange={(e) => handleChangeLocal("section", e.target.value)}>
            {renderOptions(sections, "", gradeType, local.grade)}
          </select>
        </label>

        <label className="eif-label full"><span className="lbl">Violation</span>
          <select className="eif-input" value={local.violation || ""} onChange={(e) => handleChangeLocal("violation", e.target.value)}>
            {renderOptions(violationOpts, local.type)}
          </select>
        </label>

        <label className="eif-label full"><span className="lbl">Sanction</span>
          <select className="eif-input" value={local.sanction || ""} onChange={(e) => handleChangeLocal("sanction", e.target.value)}>
            {renderOptions(sanctionOpts, local.type)}
          </select>
        </label>
      </div>

      {statusMessage && (
        <div className={`eif-status ${statusMessage.type === "error" ? "error" : "success"}`}>{statusMessage.text}</div>
      )}

      <div className="eif-actions modern-actions">
        <button className="btn btn-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <button className="btn btn-save" onClick={handleSave} disabled={saving || !local.violation || !String(local.violation).trim()}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

/* -------------------------
   MajorOffenseModal (kept consistent with your original file)
   ------------------------- */
function MajorOffenseModal({ step = 1, student, savedData = {}, onSave = () => {}, onClose = () => {} }) {
  const [s1, setS1] = useState({ incidentReport: savedData?.incidentReport || "" });
  const [s2, setS2] = useState({ chairDean: savedData?.chairDean || "", facultyMember: savedData?.facultyMember || "", sscRep: savedData?.sscRep || "", dscRep: savedData?.dscRep || "", guidance: savedData?.guidance || "" });
  const [s3, setS3] = useState({ complainant: !!savedData?.complainant, respondentPresent: !!savedData?.respondentPresent, parentsPresent: !!savedData?.parentsPresent, witnessTestimonies: !!savedData?.witnessTestimonies, finalStatements: !!savedData?.finalStatements });
  const [s4, setS4] = useState({ sanction: savedData?.sanction || "" });
  const [s5, setS5] = useState({ decisionApproval: savedData?.decisionApproval || "" });

  useEffect(() => {
    setS1({ incidentReport: savedData?.incidentReport || "" });
    setS2({ chairDean: savedData?.chairDean || "", facultyMember: savedData?.facultyMember || "", sscRep: savedData?.sscRep || "", dscRep: savedData?.dscRep || "", guidance: savedData?.guidance || "" });
    setS3({ complainant: !!savedData?.complainant, respondentPresent: !!savedData?.respondentPresent, parentsPresent: !!savedData?.parentsPresent, witnessTestimonies: !!savedData?.witnessTestimonies, finalStatements: !!savedData?.finalStatements });
    setS4({ sanction: savedData?.sanction || "" });
    setS5({ decisionApproval: savedData?.decisionApproval || "" });
  }, [savedData]);

  const saveCurrent = () => {
    onSave();
  };

  const renderProgress = (activeIndex) => {
    const dots = [1,2,3,4,5];
    return <div className="major-modal-progress" aria-hidden>{dots.map(d => <span key={d} className={`dot ${d <= activeIndex ? "active" : ""}`} />)}</div>;
  };

  return (
    <div className="major-modal-container">
      <div className="major-modal-topbar" />
      <div className="major-modal-body">
        <div className="major-modal-header-strip"><div className="major-modal-title">Major Offense</div></div>
        {renderProgress(step)}
        {step === 1 && (
          <div className="major-modal-step">
            <label>Incident Report</label>
            <textarea placeholder="Write incident report..." value={s1.incidentReport} onChange={(e) => setS1({ incidentReport: e.target.value })} />
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
                <input type="text" value={s2.chairDean} onChange={(e) => setS2(s => ({...s, chairDean: e.target.value}))} />
              </div>
              <div>
                <label>Faculty Member</label>
                <input type="text" value={s2.facultyMember} onChange={(e) => setS2(s => ({...s, facultyMember: e.target.value}))} />
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
              <label><input type="checkbox" checked={s3.complainant} onChange={(e) => setS3(s => ({...s, complainant: e.target.checked}))} /> Complainant</label>
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
              <select className="sanction-select" value={s4.sanction} onChange={(e) => setS4({ sanction: e.target.value })}>
                <option value="">Select</option>
                <option value="Suspension">Suspension</option>
                <option value="Exclusion">Exclusion</option>
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
            <select value={s5.decisionApproval} onChange={(e) => setS5({ decisionApproval: e.target.value })}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <div className="major-modal-actions">
              <button className="btn-back" onClick={onClose}>Back</button>
              <button className="btn-primary" onClick={saveCurrent}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------
   FilterPopover component (used in page-level Filter button)
   ------------------------- */
function FilterPopover({ onApply, onClose }) {
  const [alpha, setAlpha] = useState(null);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [violationOptionsLocal, setViolationOptionsLocal] = useState([]);

  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [violation, setViolation] = useState("");

  useEffect(() => {/* Implement fetching of options if needed */}, []);

  const toggleAlphaAsc = () => setAlpha((v) => (v === "asc" ? null : "asc"));
  const toggleAlphaDesc = () => setAlpha((v) => (v === "desc" ? null : "desc"));

  const apply = () => onApply({ alpha, department, grade, section, violation });

  return (
    <div style={{ width: 340, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={toggleAlphaAsc} style={{ background: alpha === "asc" ? "#111827" : "#eee", color: alpha === "asc" ? "#fff" : "#111827" }}>A→Z</button>
        <button onClick={toggleAlphaDesc} style={{ background: alpha === "desc" ? "#111827" : "#eee", color: alpha === "desc" ? "#fff" : "#111827" }}>Z→A</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label>Department<select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">Any</option>{(departmentOptions||[]).map((d,i)=><option key={i} value={d}>{d}</option>)}</select></label>
        <label>Grade<select value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">Any</option>{(gradeOptions||[]).map((g,i)=><option key={i} value={g}>{g}</option>)}</select></label>
        <label>Section<select value={section} onChange={(e) => setSection(e.target.value)}><option value="">Any</option>{(sectionOptions||[]).map((s,i)=><option key={i} value={s}>{s}</option>)}</select></label>
        <label>Violation<select value={violation} onChange={(e) => setViolation(e.target.value)}><option value="">Any</option>{(violationOptionsLocal||[]).map((v,i)=><option key={i} value={v}>{v}</option>)}</select></label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={() => { onClose(); }}>Close</button>
        <button onClick={() => apply()}>Apply</button>
      </div>
    </div>
  );
}