import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const userName = localStorage.getItem("userName");
    if (userName) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  const mobileLogin = async () => {
    if (!name.trim() || !mobile.trim()) {
      setMessage("Enter name and mobile number");
      return;
    }

    try {
      const res = await API.post("/auth/mobile-login", {
        name: name.trim(),
        mobile: mobile.trim(),
      });

      localStorage.setItem("userName", res.data.name || name.trim());
      localStorage.setItem("userMobile", res.data.mobile || mobile.trim());
      localStorage.setItem("loginMethod", res.data.loginMethod || "MOBILE");
      localStorage.setItem("userRole", res.data.role || "USER");

      setMessage("Login successful ✅");
      setTimeout(() => navigate("/home"), 900);
    } catch (err) {
      console.error("Mobile login error:", err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.details ||
        "Mobile login failed ❌";
      setMessage(String(errorMessage));
    }
  };

  const guestLogin = async () => {
    try {
      const guestName = name.trim() || "Guest";
      const res = await API.post("/auth/guest", { name: guestName });

      localStorage.setItem("userName", res.data.name || guestName);
      localStorage.removeItem("userMobile");
      localStorage.setItem("loginMethod", res.data.loginMethod || "GUEST");
      localStorage.setItem("userRole", res.data.role || "USER");

      setMessage("Guest login successful ✅");
      setTimeout(() => navigate("/home"), 900);
    } catch (err) {
      console.error("Guest login error:", err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Guest login failed ❌";
      setMessage(String(errorMessage));
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

          <button className="btn-primary" onClick={mobileLogin}>
            Login with Mobile
          </button>

          <button className="btn-secondary" onClick={guestLogin}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}