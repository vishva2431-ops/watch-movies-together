import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import Header from "../components/Header";

export default function HomePage() {
  const [joinCode, setJoinCode] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const navigate = useNavigate();
  const currentUser = localStorage.getItem("userName") || "Guest";
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const createEmptyRoom = async () => {
    const res = await API.post("/rooms/create", {
      userName: currentUser,
      movieId: "",
    });

    navigate(`/room/${res.data.roomCode}`);
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();

    if (!code) {
      setAlertMessage("Please enter the room code");
      return;
    }

    try {
      await API.get(`/rooms/${code}`);
      navigate(`/room/${code}`);
    } catch (err) {
      setAlertMessage("Invalid room code");
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="page home-page-bg">
      <div className="home-top-bar">
        <div className="home-brand">
          <img
            src="/logo.png"
            alt="Vision Arc Logo"
            className="home-logo"
          />
          <h1 className="vision-title">Vision Arc</h1>
        </div>

        <div className="home-mobile-user-row">
          <div className="user-pill">{currentUser}</div>

          <button className="btn-secondary home-logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {alertMessage && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-box">
            <h3>Room Code Required</h3>
            <p>{alertMessage}</p>
            <button className="btn-primary" onClick={() => setAlertMessage("")}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="home-controls-container">
        <div className="home-controls-row">
          <div className="join-room-wrapper">
            <input
              className="join-room-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
            />

            <button className="join-room-inside-btn" onClick={joinRoom}>
              Join
            </button>
          </div>

          {isAdmin && (
            <button
              className="btn-secondary home-control-btn"
              onClick={() => navigate("/admin")}
            >
              Admin
            </button>
          )}
        </div>
      </div>

      <div className="home-hero-card">
        <div className="section-badge">🌟 Unlimited Entertainment Together</div>
        <h1>Watch Movies, Music and Shorts Together</h1>
        <p>Select category, search content, create a room, and watch together in sync.</p>
      </div>

      <div className="category-choice-grid">
        <button className="category-choice-card" onClick={() => navigate("/movies")}>
          <span>🎬</span>
          <h2>Movies</h2>
          <p>Trailers, scenes and full movie content</p>
        </button>

        <button className="category-choice-card" onClick={() => navigate("/music")}>
          <span>🎵</span>
          <h2>Music</h2>
          <p>Songs, albums and live performances</p>
        </button>

        <button className="category-choice-card" onClick={() => navigate("/shorts")}>
          <span>⚡</span>
          <h2>Shorts</h2>
          <p>Funny, love, gym, cooking and reels-style videos</p>
        </button>
      </div>
    </div>
  );
}