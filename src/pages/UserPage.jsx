// src/pages/UserPage.jsx
import React, { useState, useRef, useEffect } from "react";
import "./UserPage.css";
import { FaEllipsisV, FaUserCircle } from "react-icons/fa";

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ username: "", email: "", role: "", password: "" });

  // ---- FETCH USERS ----
  const fetchUsers = () => {
    fetch("http://localhost/SDSUpdate1-main/backend/user.php", { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching users:", err));
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
    fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, action: "add" }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchUsers(); // Refresh users
          setFormData({ username: "", email: "", role: "", password: "" });
          setShowAddModal(false);
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => console.error("Error saving user:", err));
  };

  // ---- EDIT ----
  const handleEdit = (e) => {
    e.preventDefault();
    fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, id: selectedUser.id, action: "update" }),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          fetchUsers(); // Refresh users
          setShowEditModal(false);
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch((err) => console.error("Error updating user:", err));
  };

  // ---- DELETE ----
  const handleDelete = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      fetch("http://localhost/SDSUpdate1-main/backend/user.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, action: "delete" }),
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            fetchUsers(); // Refresh users
            setShowViewModal(false);
          } else {
            alert("Error: " + data.message);
          }
        })
        .catch((err) => console.error("Error deleting user:", err));
    }
  };

  // ---- MODAL CONTROLS ----
  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const openEditModal = () => {
    setFormData(selectedUser);
    setShowViewModal(false);
    setShowEditModal(true);
  };

  // ---- SEARCH ----
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="user-container">
      <div className="user-header">
        <h2>User Management</h2>
        <div className="user-info">
          <FaUserCircle className="user-icon" />
          <span className="username">Admin User</span>
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
          filteredUsers.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-card-top">
                <div className="avatar">{user.username.charAt(0)}</div>
                <div className="user-meta">
                  <div className="user-name">{user.username}</div>
                  <div className="user-email">{user.email}</div>
                </div>
              </div>
              <div className="user-role">{user.role}</div>
              <div className="user-actions">
                <FaEllipsisV className="icon" onClick={() => openViewModal(user)} />
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
