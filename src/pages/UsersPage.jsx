import { useEffect, useState } from "react";
import { API } from "../api";
import Header from "../components/Header";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const userName = localStorage.getItem("userName") || "Guest";

  const loadUsers = async () => {
    try {
      const res = await API.get("/auth/users");
      setUsers(Array.isArray(res.data) ? res.data : []);
      setMessage("");
    } catch (err) {
      console.error("Load users error:", err);
      setMessage("Failed to load users ❌");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="page admin-page-bg">
      <Header userName={userName} />

      <div className="admin-layout">
        <div className="admin-list-card" style={{ gridColumn: "1 / -1" }}>
          <div className="section-badge">Admin Panel</div>
          <h2 className="section-title">Users</h2>
          <p className="section-subtitle">
            View all users who logged in to the app.
          </p>

          {message && <div className="login-message">{message}</div>}

          <div className="admin-movie-list">
            {users.length === 0 ? (
              <div className="empty-state">No users available.</div>
            ) : (
              users.map((user) => (
                <div className="admin-movie-item" key={user.id}>
                  <div className="admin-movie-info">
                    <h3>{user.name || "No Name"}</h3>
                    <p><strong>Mobile:</strong> {user.mobile || "-"}</p>
                    <p><strong>Login Method:</strong> {user.loginMethod || "-"}</p>
                    <p><strong>Provider:</strong> {user.provider || "-"}</p>
                    <p><strong>Role:</strong> {user.role || "-"}</p>
                    <p><strong>Email:</strong> {user.email || "-"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}