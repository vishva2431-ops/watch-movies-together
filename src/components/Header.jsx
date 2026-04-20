import { useNavigate } from "react-router-dom";

export default function Header({ userName }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userMobile");
    localStorage.removeItem("loginMethod");
    localStorage.removeItem("userRole");
    navigate("/", { replace: true });
  };

  return (
    <div className="header-bar">
      <div className="header-left">
        <h2 className="app-logo" onClick={() => navigate("/home")}>
          Watch Party
        </h2>
      </div>

      <div className="header-right">
        <span className="user-chip">{userName}</span>
        <button className="btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}