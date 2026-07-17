import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function Header({ userName, onUsersClick }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const id = localStorage.getItem("id");

      if (id) {
        await API.post("/auth/logout", { id });
      }
    } catch (err) {
      console.error(err);
    }

    localStorage.clear();
    navigate("/");
  };

  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return (
    <div className="header">

      {/* <div>
        <h2>Watch Party</h2>
        <p className="header-sub">Watch movies together in sync</p>
      </div> */}

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* <div className="user-pill">
          {userName || "Guest"}
        </div> */}

        {isAdmin && (
          <button
            className="header-user-btn"
            onClick={onUsersClick}
          >
            Users
          </button>
        )}

        <button
          className="btn-secondary small-btn"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

    </div>
  );
}