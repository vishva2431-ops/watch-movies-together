import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import Header from "../components/Header";
import MovieCard from "../components/MovieCard";

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("userName") || "Guest");
  const navigate = useNavigate();

  const currentMobile = localStorage.getItem("userMobile") || "";
  const isAdminUser =
    currentUser?.trim() === "Vishva_N" &&
    currentMobile?.trim() === "9025783849";

  useEffect(() => {
    API.get("/movies")
      .then((res) => setMovies(res.data))
      .catch((err) => console.error(err));

    const localName = localStorage.getItem("userName") || "Guest";
    setCurrentUser(localName);
  }, []);

  const filteredMovies = useMemo(() => {
    const value = search.toLowerCase();

    return movies.filter((movie) =>
      movie.groupTitle?.toLowerCase().includes(value) ||
      movie.partTitle?.toLowerCase().includes(value) ||
      String(movie.partNumber || "").includes(value)
    );
  }, [movies, search]);

  const createRoomOnly = async () => {
    try {
      const res = await API.post("/rooms/create", {});
      const roomCode = res.data.roomCode;

      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        alert("Room creation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Room creation failed");
    }
  };

  const createRoomFromMovie = async (movieId) => {
    try {
      const res = await API.post("/rooms/create", {
        movieId,
        userName: currentUser
      });

      const roomCode = res.data.roomCode;
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        alert("Room creation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Room creation failed");
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      alert("Enter room code");
      return;
    }

    try {
      await API.get(`/rooms/${joinCode.trim()}`);
      navigate(`/room/${joinCode.trim()}`);
    } catch (err) {
      console.error(err);
      alert("Invalid room code");
    }
  };

  return (
    <div className="page home-page-bg">
      <Header userName={currentUser} />

      <div className="top-tools">
        <input
          className="input-modern tools-input"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter room code"
        />

        <button
          className="btn-primary tools-btn"
          onClick={joinRoom}
        >
          Join Room
        </button>

        <button
          className="btn-primary tools-btn"
          onClick={createRoomOnly}
        >
          Create Room
        </button>

        {isAdminUser && (
          <>
            <button
              className="btn-secondary tools-btn"
              onClick={() => navigate("/admin")}
            >
              Admin
            </button>

            <button
              className="btn-secondary tools-btn"
              onClick={() => navigate("/admin/users")}
            >
              Users
            </button>
          </>
        )}
      </div>

      <div className="search-bar-wrap">
        <input
          className="input-modern"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search movie or part..."
        />
      </div>

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