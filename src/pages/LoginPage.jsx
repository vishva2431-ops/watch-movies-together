import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const mobileLogin = async () => {
  try {
    const finalName = name.trim() || "User";

    await API.post("/auth/mobile-login", {
      name: finalName,
      mobile,
    });

    const ADMIN_MOBILE = "9025783849";
    const ADMIN_NAME = "Vishva_N";

    localStorage.setItem("userName", finalName);
    localStorage.setItem("mobile", mobile);
    localStorage.setItem("loginMethod", "MOBILE");

    if (mobile === ADMIN_MOBILE && finalName === ADMIN_NAME) {
      localStorage.setItem("isAdmin", "true");
    } else {
      localStorage.setItem("isAdmin", "false");
    }

    navigate("/home");
  } catch (err) {
    console.error(err);
    setMessage("Mobile login failed ❌");
  }
};

  const guestLogin = async () => {
    try {
      const guestName = name.trim() || "Guest";
      const res = await API.post("/auth/guest", { name: guestName });

      localStorage.setItem("userName", res.data.name || guestName);
      localStorage.removeItem("mobile");
      localStorage.setItem("loginMethod", "GUEST");
      localStorage.setItem("isAdmin", "false");

      setMessage("Guest login successful ✅");
      setTimeout(() => navigate("/home"), 900);
    } catch (err) {
      console.error(err);
      setMessage("Guest login failed ❌");
    }
  };

  return (
    <div className="page center-page">
      <div className="login-shell">
        <div className="login-card">
          <div className="login-badge">Watch together</div>
          <h1 className="login-title">Watch Party</h1>
          <p className="login-subtitle">
            Create rooms, stream movies, and chat with friends.
          </p>

          {message && <div className="login-message">{message}</div>}

          <div className="form-group">
            <input
              className="input-modern"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <input
              className="input-modern"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
          </div>

          <div className="login-buttons">
            <button className="btn-primary" onClick={mobileLogin}>
              Login with Mobile
            </button>

            <button className="btn-secondary" onClick={guestLogin}>
              Continue as Guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}