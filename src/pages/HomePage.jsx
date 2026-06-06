import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import Header from "../components/Header";
import MovieCard from "../components/MovieCard";

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const navigate = useNavigate();
  const currentUser = localStorage.getItem("userName") || "Guest";

  useEffect(() => {
    API.get("/movies")
      .then((res) => setMovies(res.data))
      .catch(console.error);
  }, []);

  const filteredMovies = useMemo(() => {
    const value = search.toLowerCase();

    return movies.filter(
      (movie) =>
        movie.groupTitle?.toLowerCase().includes(value) ||
        movie.partTitle?.toLowerCase().includes(value)
    );
  }, [movies, search]);

  const createEmptyRoom = async () => {
    const res = await API.post("/rooms/create", {
      userName: currentUser,
      movieId: "",
    });

    navigate(`/room/${res.data.roomCode}`);
  };

  const createRoomFromMovie = async (movieId) => {
    const res = await API.post("/rooms/create", {
      movieId,
      userName: currentUser,
    });

    navigate(`/room/${res.data.roomCode}`);
  };

  const joinRoom = () => {
    if (!joinCode.trim()) {
      setAlertMessage("Please enter the room code");
      return;
    }

    navigate(`/room/${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="page home-page-bg">
      <Header userName={currentUser} />
      {alertMessage && (
        <div className="custom-alert-overlay">
          <div className="custom-alert-box">
            <h3>Room Code Required</h3>
            <p>{alertMessage}</p>

            <button
              className="btn-primary"
              onClick={() => setAlertMessage("")}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="home-controls-container">
        <div className="home-controls-row">
          <input
            className="input-modern home-control-input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
          />

          <button className="btn-primary home-control-btn" onClick={joinRoom}>
            Join Room
          </button>

          <button
            className="btn-primary home-control-btn"
            onClick={createEmptyRoom}
          >
            Create Room
          </button>

          <button
            className="btn-secondary home-control-btn"
            onClick={() => navigate("/admin")}
          >
            Admin
          </button>
        </div>

        <div className="home-search-row">
          <input
            className="input-modern home-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for movies..."
          />
        </div>
      </div>

      <h2 className="section-title">Trending Now</h2>

      <div className="movie-grid">
        {filteredMovies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onCreateRoom={createRoomFromMovie}
          />
        ))}
      </div>
    </div>
  );
}