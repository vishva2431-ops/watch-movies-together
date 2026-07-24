import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import "./HomePage.css";

export default function HomePage() {
  const [joinCode, setJoinCode] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const navigate = useNavigate();

  const currentUser = localStorage.getItem("userName") || "Guest";
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const createEmptyRoom = async () => {
    try {
      const res = await API.post("/rooms/create", {
        userName: currentUser,
        movieId: "",
      });

      navigate(`/room/${res.data.roomCode}`);
    } catch (err) {
      console.error("Room creation failed:", err);
      setAlertMessage("Unable to create room");
    }
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
      console.error("Room join failed:", err);
      setAlertMessage("Invalid room code");
    }
  };

  const handleJoinKeyDown = (event) => {
    if (event.key === "Enter") {
      joinRoom();
    }
  };

  const logout = async () => {
    try {
      const id =
        localStorage.getItem("userId") ||
        localStorage.getItem("id");

      if (id) {
        await API.post("/auth/logout", { id });
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }

    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="va-home-page">
      <div className="va-background-grid" />
      <div className="va-glow va-glow-one" />
      <div className="va-glow va-glow-two" />
      <div className="va-glow va-glow-three" />

      <header className="va-header">
        <button
          type="button"
          className="va-brand"
          onClick={() => navigate("/home")}
          aria-label="Vision Arc home"
        >
          <img
            src="/logo.png"
            alt="Vision Arc Logo"
            className="va-logo"
          />

          <h1 className="va-brand-title">
            Vision Arc
          </h1>
        </button>

        <div className="va-user-actions">
          <div className="va-user-pill">
            <span className="va-user-indicator" />
            <span>{currentUser}</span>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="va-outline-button"
              onClick={() => navigate("/admin")}
            >
              Admin
            </button>
          )}

          <button
            type="button"
            className="va-outline-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="va-main">
        <section className="va-room-panel">
          <div className="va-room-input-wrapper">
            <span className="va-room-input-icon">
              🔗
            </span>

            <input
              type="text"
              className="va-room-input"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(event.target.value.toUpperCase())
              }
              onKeyDown={handleJoinKeyDown}
              placeholder="Enter room code"
              maxLength={12}
            />

            <button
              type="button"
              className="va-join-button"
              onClick={joinRoom}
            >
              Join Room
            </button>
          </div>

          <div className="va-panel-divider" />

          <button
            type="button"
            className="va-friends-button"
            onClick={() => navigate("/friends")}
          >
            <span>👥</span>
            Friends
          </button>
        </section>

        <section className="va-hero">
          <div className="va-hero-content">
            <div className="va-section-badge">
              <span>🌟</span>
              Unlimited Entertainment Together
            </div>

            <h2 className="va-hero-title">
              Watch Movies, Music and Shorts{" "}
              <span>Together</span>
            </h2>

            <p className="va-hero-description">
              Create a private room, invite your friends and enjoy
              perfectly synchronized entertainment in real time.
            </p>

            <div className="va-hero-actions">
              <button
                type="button"
                className="va-primary-button"
                onClick={createEmptyRoom}
              >
                <span>＋</span>
                Create Room
              </button>

              <button
                type="button"
                className="va-secondary-button"
                onClick={() => navigate("/movies")}
              >
                Explore Content
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="va-hero-visual">
            <div className="va-visual-orbit va-orbit-large" />
            <div className="va-visual-orbit va-orbit-small" />

            <div className="va-floating-icon va-popcorn">
              🍿
            </div>

            <div className="va-floating-icon va-clapper">
              🎬
            </div>

            <div className="va-floating-icon va-play-icon">
              ▶
            </div>

            <div className="va-visual-platform" />
          </div>
        </section>

        <section className="va-category-grid">
          <button
            type="button"
            className="va-category-card va-movie-card"
            onClick={() => navigate("/movies")}
          >
            <div className="va-category-pattern" />

            <div className="va-category-icon">
              🎬
            </div>

            <div className="va-category-content">
              <h3>Movies</h3>

              <p>
                Trailers, scenes and full movie content
              </p>
            </div>

            <div className="va-category-arrow">
              →
            </div>
          </button>

          <button
            type="button"
            className="va-category-card va-music-card"
            onClick={() => navigate("/music")}
          >
            <div className="va-category-pattern" />

            <div className="va-category-icon">
              🎵
            </div>

            <div className="va-category-content">
              <h3>Music</h3>

              <p>
                Songs, albums and live performances
              </p>
            </div>

            <div className="va-category-arrow">
              →
            </div>
          </button>

          <button
            type="button"
            className="va-category-card va-shorts-card"
            onClick={() => navigate("/shorts")}
          >
            <div className="va-category-pattern" />

            <div className="va-category-icon">
              ▶
            </div>

            <div className="va-category-content">
              <h3>Shorts</h3>

              <p>
                Funny, love, gym, cooking and reels-style videos
              </p>
            </div>

            <div className="va-category-arrow">
              →
            </div>
          </button>
        </section>
      </main>

      {alertMessage && (
        <div
          className="va-alert-overlay"
          onClick={() => setAlertMessage("")}
        >
          <div
            className="va-alert-box"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="va-alert-icon">
              !
            </div>

            <h3>Room Notice</h3>

            <p>{alertMessage}</p>

            <button
              type="button"
              className="va-primary-button va-alert-button"
              onClick={() => setAlertMessage("")}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}