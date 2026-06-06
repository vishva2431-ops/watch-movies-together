import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";

export default function LoginPage() {
  const [loginType, setLoginType] = useState("USER");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    setAlreadyLoggedIn(
      localStorage.getItem("loggedIn") === "true" &&
      localStorage.getItem("rememberMe") === "true"
    );

    setName(localStorage.getItem("rememberedName") || "");
    setMobile(localStorage.getItem("rememberedMobile") || "");
    setEmail(localStorage.getItem("rememberedEmail") || "");
  }, []);

  const changeLoginType = (type) => {
    setLoginType(type);
    setOtp("");
    setOtpSent(false);
    setPassword("");
    setMessage("");
  };

  const saveLogin = (user, isAdmin) => {
    localStorage.setItem("userId", user.id || "");
    localStorage.setItem("userName", user.name || name.trim());
    localStorage.setItem("userMobile", user.mobile || mobile.trim());
    localStorage.setItem("userEmail", user.email || email.trim());
    localStorage.setItem("loginProvider", user.loginProvider || "EMAIL");
    localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
    if (rememberMe) {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("rememberMe", "true");
    } else {
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("rememberMe");
    }

    localStorage.setItem("rememberedName", user.name || name.trim());
    localStorage.setItem("rememberedMobile", user.mobile || mobile.trim());
    localStorage.setItem("rememberedEmail", user.email || email.trim());

    setAlreadyLoggedIn(true);
  };

  const continueWithoutOtp = () => {
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/home");
    }
  };

  const logoutSavedUser = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userMobile");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loginProvider");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("rememberMe");

    setAlreadyLoggedIn(false);
    setMessage("Logged out. You can login again.");
  };

  const sendEmailOtp = async () => {
    if (!name.trim() || !mobile.trim() || !email.trim()) {
      setMessage("Enter name, mobile number and email");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      setMessage("Enter valid 10 digit mobile number");
      return;
    }

    if (!email.includes("@")) {
      setMessage("Enter valid email address");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/email/send-otp", {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
      });

      setOtpSent(true);
      setMessage(res.data.message || "OTP sent to your email ✅");
    } catch (err) {
      console.error(err);
      setMessage("Email OTP sending failed ❌");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (!otp.trim()) {
      setMessage("Enter OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/email/verify-otp", {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        otp: otp.trim(),
      });

      saveLogin(res.data, false);
      navigate("/home");
    } catch (err) {
      console.error(err);
      setMessage("Invalid OTP ❌");
    } finally {
      setLoading(false);
    }
  };

  const adminLogin = async () => {
    if (!name.trim() || !mobile.trim() || !password.trim()) {
      setMessage("Enter admin name, mobile and password");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/admin/login", {
        name: name.trim(),
        mobile: mobile.trim(),
        password: password.trim(),
      });

      saveLogin(res.data, true);
      navigate("/admin");
    } catch (err) {
      console.error(err);
      setMessage("Invalid admin login ❌");
    } finally {
      setLoading(false);
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

          {alreadyLoggedIn && (
            <div className="login-message">
              Saved login found for {localStorage.getItem("rememberedName") || "User"}
            </div>
          )}

          {message && <div className="login-message">{message}</div>}

          {alreadyLoggedIn && (
            <div className="room-action-row">
              <button
                className="btn-primary"
                onClick={continueWithoutOtp}
                type="button"
              >
                Continue without OTP
              </button>

              <button
                className="btn-secondary"
                onClick={logoutSavedUser}
                type="button"
              >
                Login with another account
              </button>
            </div>
          )}

          <div className="form-group">
            <input
              className="input-modern"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="room-action-row">
            <button
              className={loginType === "USER" ? "btn-primary" : "btn-secondary"}
              onClick={() => changeLoginType("USER")}
              type="button"
            >
              User Login
            </button>

            <button
              className={loginType === "ADMIN" ? "btn-primary" : "btn-secondary"}
              onClick={() => changeLoginType("ADMIN")}
              type="button"
            >
              Admin Login
            </button>
          </div>

          {loginType === "USER" && (
            <>
              <div className="form-group">
                <input
                  className="input-modern"
                  placeholder="Enter mobile number"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </div>

              <div className="form-group">
                <input
                  className="input-modern"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="remember-me-row">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember Me
                </label>
              </div>

              {otpSent && (
                <div className="form-group">
                  <input
                    className="input-modern"
                    placeholder="Enter email OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                  />
                </div>
              )}

              {!otpSent ? (
                <button
                  className="btn-primary"
                  onClick={sendEmailOtp}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Email OTP"}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={verifyEmailOtp}
                  disabled={loading}
                >
                  {loading ? "Verifying..." : "Verify OTP & Login"}
                </button>
              )}
            </>
          )}

          {loginType === "ADMIN" && (
            <>
              <div className="form-group">
                <input
                  className="input-modern"
                  placeholder="Admin mobile number"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </div>

              <div className="form-group">
                <input
                  className="input-modern"
                  type="password"
                  placeholder="Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={adminLogin}
                disabled={loading}
              >
                {loading ? "Checking..." : "Login as Admin"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}