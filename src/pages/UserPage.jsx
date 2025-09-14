// src/pages/UserPage.jsx
import React, { useState, useRef, useEffect } from "react";
import "./UserPage.css";
import { FaEllipsisV, FaUserCircle } from "react-icons/fa";

export default function UserPage({ user }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ username: "", email: "", role: "", password: "" });
  const [adding, setAdding] = useState(false);

  // Toast state & timeout ref
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimeoutRef = useRef(null);

  // helper to show toast messages
  const showToast = (message, type = "success", duration = 3000) => {
    // clear previous timeout if any
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type });
      toastTimeoutRef.current = null;
    }, duration);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ---- FETCH USERS ----
  const fetchUsers = () => {
    fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
      credentials: "include",
    })
      .then(async (res) => {
        const text = await res.text();
        try {
          const data = JSON.parse(text || "null");
          setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error("Failed to parse users response:", text);
          alert("Failed to load users. See console for response.");
        }
      })
      .catch((err) => {
        console.error("Error fetching users:", err);
        alert("Network error while fetching users. Check console.");
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ---- INPUT HANDLER ----
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ---- ADD ----
  const handleAdd = (e) => {
    e.preventDefault();
    if (adding) return;

    // basic client-side validation
    if (!formData.email || !formData.password) {
      alert("Email and password are required.");
      return;
    }

    setAdding(true);

    const payload = {
      username: formData.username || "",
      email: formData.email || "",
      password: formData.password || "",
      role: (formData.role || "").toUpperCase(),
      action: "add",
    };

    fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
      .then(async (res) => {
        const text = await res.text();
        // try parse JSON, otherwise show raw text
        try {
          const data = JSON.parse(text || "null");
          if (data && data.success) {
            fetchUsers(); // Refresh users
            setFormData({ username: "", email: "", role: "", password: "" });
            setShowAddModal(false);
            // show top-right toast instead of alert
            showToast("User added successfully.", "success");
          } else {
            const msg = data && data.message ? data.message : "Unknown server response";
            // show toast for error as well
            showToast("Failed to add user: " + msg, "error");
            console.error("Add user response:", data);
          }
        } catch (err) {
          // not JSON — probably PHP error/stacktrace/HTML
          console.error("Non-JSON response from add user:", text);
          showToast("Server returned unexpected response while adding user. See console.", "error");
        }
      })
      .catch((err) => {
        console.error("Error saving user:", err);
        showToast("Network error while adding user. Check console.", "error");
      })
      .finally(() => setAdding(false));
  };

  // ---- EDIT ----
  const handleEdit = (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      role: (formData.role || "").toUpperCase(),
      id: selectedUser.id,
      action: "update",
    };

    fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchUsers(); // Refresh users
          setShowEditModal(false);
          showToast("User updated.", "success");
        } else {
          showToast("Error: " + data.message, "error");
        }
      })
      .catch((err) => {
        console.error("Error updating user:", err);
        showToast("Network error while updating user.", "error");
      });
  };

  // ---- DELETE ----
  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "delete" }),
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            fetchUsers(); // Refresh users
            setShowViewModal(false);
            showToast("User deleted.", "success");
          } else {
            showToast("Error: " + data.message, "error");
          }
        })
        .catch((err) => {
          console.error("Error deleting user:", err);
          showToast("Network error while deleting user.", "error");
        });
    }
  };

  // ---- MODAL CONTROLS ----
  const openViewModal = (userObj) => {
    setSelectedUser(userObj);
    setShowViewModal(true);
  };

  const openEditModal = () => {
    // map selectedUser fields to formData and clear password input
    setFormData({
      username: selectedUser.username || "",
      email: selectedUser.email || "",
      role: selectedUser.role || "",
      password: "",
    });
    setShowViewModal(false);
    setShowEditModal(true);
  };

  // ---- SEARCH ----
  const filteredUsers = users.filter(
    (u) =>
      (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.role || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard-container">
      {/* Toast: top-right */}
      {toast.show && (
        <div className={`toast ${toast.type}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {/* Header (matches Dashboard design) */}
      <div className="dashboard-header-bar">
        <h1 className="dashboard-title">User Management</h1>
        <div className="user-account">
          <img src="/rcclogo.png" alt="RCC Logo" className="account-logo" />
          <span className="account-name">
            {user?.username || user?.email || user?.role || "User"}
          </span>
          <span className="dropdown-icon">▾</span>
        </div>
      </div>

      <div className="user-controls">
        <input
          type="text"
          placeholder="Search..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="button-group">
          <button className="btn primary" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>
      </div>

      <div className="cards-grid">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((userItem) => (
            <div key={userItem.id} className="user-card">
              <div className="user-card-top">
                <div className="avatar">{(userItem.username || "U").charAt(0)}</div>
                <div className="user-meta">
                  <div className="user-name">{userItem.username}</div>
                  <div className="user-email">{userItem.email}</div>
                </div>
              </div>
              <div className="user-role">{userItem.role}</div>
              <div className="user-actions">
                <FaEllipsisV className="icon" onClick={() => openViewModal(userItem)} />
              </div>
            </div>
          ))
        ) : (
          <div className="empty-note">No users found.</div>
        )}
      </div>

      {/* ---- VIEW MODAL ---- */}
      {showViewModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>User Information</h3></div>
            <div className="modal-body">
              <p><b>Username:</b> {selectedUser.username}</p>
              <p><b>Email:</b> {selectedUser.email}</p>
              <p><b>Role:</b> {selectedUser.role}</p>
            </div>
            <div className="modal-footer">
              <button className="btn cancel" onClick={() => setShowViewModal(false)}>Cancel</button>
              <button className="btn" onClick={openEditModal}>Edit</button>
              <button className="btn primary" onClick={() => handleDelete(selectedUser.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- ADD MODAL ---- */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>Add User</h3></div>
            <form onSubmit={handleAdd}>
              <div className="modal-body">
                <label>Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} required />
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleInputChange} required>
                  <option value="">Select Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OSA">OSA</option>
                  <option value="GUEST">Guest</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn add">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- EDIT MODAL ---- */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header"><h3>Edit User</h3></div>
            <form onSubmit={handleEdit}>
              <div className="modal-body">
                <label>Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} required />
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                <label>Password (leave blank to keep current)</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} />
                <label>Role</label>
                <select name="role" value={formData.role} onChange={handleInputChange} required>
                  <option value="">Select Role</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OSA">OSA</option>
                  <option value="GUEST">Guest</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn add">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
