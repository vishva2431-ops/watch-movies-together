import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import "./LoginPage.css";

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
  // Clear previous session
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userMobile");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("loginProvider");

  // Save new session
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

navigate(isAdmin ? "/admin" : "/home");
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
  console.error("SEND OTP ERROR:", err);
  console.error("SEND OTP RESPONSE:", err?.response);
  console.error("SEND OTP DATA:", err?.response?.data);

  setMessage(
    err?.response?.data?.message ||
    err?.message ||
    "Email OTP sending failed ❌"
  );
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
  <div className="va-login-page">
    <div className="va-login-stars"></div>
    <div className="va-login-planet va-login-planet-one"></div>
    <div className="va-login-planet va-login-planet-two"></div>
    <div className="va-login-wave va-login-wave-left"></div>
    <div className="va-login-wave va-login-wave-right"></div>

    <main className="va-login-content">
      <section className="va-login-brand-section">
        <img
          src="/logo.png"
          alt="Vision Arc Logo"
          className="va-login-logo"
        />

        <h1 className="va-login-title">Vision Arc</h1>

        <div className="va-login-badge">
          Connect Together
          <span>👥</span>
        </div>

        <p className="va-login-subtitle">
          Create Rooms, Sync Together, And
          <br />
          Chat With Friends.
        </p>
      </section>

      <section className="va-login-card">
        {alreadyLoggedIn && (
          <div className="va-login-message">
            Saved login found for{" "}
            {localStorage.getItem("rememberedName") || "User"}
          </div>
        )}

        {message && (
          <div className="va-login-message">
            {message}
          </div>
        )}

        {alreadyLoggedIn && (
          <div className="va-saved-login-actions">
            <button
              type="button"
              className="va-login-main-button"
              onClick={continueWithoutOtp}
            >
              Continue without OTP
            </button>

            <button
              type="button"
              className="va-login-secondary-button"
              onClick={logoutSavedUser}
            >
              Login with another account
            </button>
          </div>
        )}

        <div className="va-login-tabs">
          <button
            type="button"
            className={`va-login-tab ${
              loginType === "USER" ? "active" : ""
            }`}
            onClick={() => changeLoginType("USER")}
          >
            <span className="va-tab-icon">♙</span>
            User Login
          </button>

          <button
            type="button"
            className={`va-login-tab ${
              loginType === "ADMIN" ? "active" : ""
            }`}
            onClick={() => changeLoginType("ADMIN")}
          >
            <span className="va-tab-icon">♢</span>
            Admin Login
          </button>
        </div>

        <div className="va-login-input-group">
          <span className="va-input-icon">♙</span>

          <input
            type="text"
            className="va-login-input"
            placeholder={
              loginType === "ADMIN"
                ? "Enter admin name"
                : "Enter your name"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        {loginType === "USER" && (
          <>
            <div className="va-login-input-group">
              <span className="va-input-icon">♧</span>

              <input
                type="tel"
                inputMode="numeric"
                className="va-login-input"
                placeholder="Enter mobile number"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                autoComplete="tel"
              />
            </div>

            <div className="va-login-input-group">
              <span className="va-input-icon">✉</span>

              <input
                type="email"
                inputMode="email"
                className="va-login-input"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <label className="va-remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(e.target.checked)
                }
              />

              <span className="va-custom-checkbox">
                ✓
              </span>

              <span>Remember Me</span>
            </label>

            {otpSent && (
              <div className="va-login-input-group">
                <span className="va-input-icon">#</span>

                <input
                  type="text"
                  inputMode="numeric"
                  className="va-login-input va-otp-input"
                  placeholder="Enter email OTP"
                  value={otp}
                  onChange={(e) =>
                    setOtp(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                />
              </div>
            )}

            {!otpSent ? (
              <button
                type="button"
                className="va-login-main-button"
                onClick={sendEmailOtp}
                disabled={loading}
              >
                <span>➤</span>
                {loading
                  ? "Sending..."
                  : "Send Email OTP"}
              </button>
            ) : (
              <button
                type="button"
                className="va-login-main-button"
                onClick={verifyEmailOtp}
                disabled={loading}
              >
                <span>✓</span>
                {loading
                  ? "Verifying..."
                  : "Verify OTP & Login"}
              </button>
            )}
          </>
        )}

        {loginType === "ADMIN" && (
          <>
            <div className="va-login-input-group">
              <span className="va-input-icon">♧</span>

              <input
                type="tel"
                inputMode="numeric"
                className="va-login-input"
                placeholder="Admin mobile number"
                value={mobile}
                onChange={(e) =>
                  setMobile(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                autoComplete="tel"
              />
            </div>

            <div className="va-login-input-group">
              <span className="va-input-icon">⌾</span>

              <input
                type="password"
                className="va-login-input"
                placeholder="Admin password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
              />
            </div>

            <label className="va-remember-row">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) =>
                  setRememberMe(e.target.checked)
                }
              />

              <span className="va-custom-checkbox">
                ✓
              </span>

              <span>Remember Me</span>
            </label>

            <button
              type="button"
              className="va-login-main-button"
              onClick={adminLogin}
              disabled={loading}
            >
              <span>♢</span>
              {loading
                ? "Checking..."
                : "Login as Admin"}
            </button>
          </>
        )}
      </section>
    </main>
  </div>
);
}