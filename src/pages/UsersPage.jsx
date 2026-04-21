import { useEffect, useState } from "react";
import { API } from "../api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    API.get("/auth/users").then((res) => setUsers(res.data));
  }, []);

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: "100%" }}>
        <h2>All Logged Users</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 10 }}>Name</th>
                <th style={{ textAlign: "left", padding: 10 }}>Mobile</th>
                <th style={{ textAlign: "left", padding: 10 }}>Email</th>
                <th style={{ textAlign: "left", padding: 10 }}>Provider</th>
                <th style={{ textAlign: "left", padding: 10 }}>Login Method</th>
                <th style={{ textAlign: "left", padding: 10 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ padding: 10 }}>{user.name}</td>
                  <td style={{ padding: 10 }}>{user.mobile || "-"}</td>
                  <td style={{ padding: 10 }}>{user.email || "-"}</td>
                  <td style={{ padding: 10 }}>{user.provider || "-"}</td>
                  <td style={{ padding: 10 }}>{user.loginMethod || "-"}</td>
                  <td style={{ padding: 10 }}>{user.role || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}