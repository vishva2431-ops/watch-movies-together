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
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const currentMobile = localStorage.getItem("userMobile") || "";
  const isAdminUser = currentUser === "Vishva_N" && currentMobile === "9025783849";

  useEffect(() => {
    API.get("/movies")
      .then((res) => setMovies(res.data || []))
      .catch((err) => {
        console.error(err);
        setMessage("Unable to load movies ❌");
      });

    const localName = localStorage.getItem("userName") || "Guest";
    setCurrentUser(localName);
  }, []);

  const groupedMovies = useMemo(() => {
    const map = new Map();

    for (const movie of movies) {
      const key = (movie.groupTitle || "").trim().toLowerCase();
      if (!key) continue;

      const existing = map.get(key);
      const currentNumber = movie.partNumber ?? Number.MAX_SAFE_INTEGER;
      const existingNumber = existing?.partNumber ?? Number.MAX_SAFE_INTEGER;

      if (!existing || currentNumber < existingNumber) {
        map.set(key, movie);
      }
    }

    return Array.from(map.values());
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const value = search.toLowerCase();

    return groupedMovies.filter((movie) =>
      movie.groupTitle?.toLowerCase().includes(value) ||
      movie.partTitle?.toLowerCase().includes(value) ||
      String(movie.partNumber || "").includes(value)
    );
  }, [groupedMovies, search]);

  const createRoomOnly = async () => {
    try {
      setMessage("");
      const res = await API.post("/rooms/create", { userName: currentUser });
      const roomCode = res.data.roomCode;

      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        setMessage("Room creation failed ❌");
      }
    } catch (err) {
      console.error(err);
      setMessage(
        err?.response?.status === 404
          ? "Room create API not found in backend ❌"
          : "Room creation failed ❌"
      );
    }
  };

  const createRoomFromMovie = async (movieId) => {
    try {
      setMessage("");
      const res = await API.post("/rooms/create", {
        movieId,
        userName: currentUser,
      });

      const roomCode = res.data.roomCode;
      if (roomCode) {
        navigate(`/room/${roomCode}`);
      } else {
        setMessage("Room creation failed ❌");
      }
    } catch (err) {
      console.error(err);
      setMessage(
        err?.response?.status === 404
          ? "Room create API not found in backend ❌"
          : "Room creation failed ❌"
      );
    }
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) {
      setMessage("Enter room code");
      return;
    }

    try {
      setMessage("");
      await API.get(`/rooms/${joinCode.trim()}`);
      navigate(`/room/${joinCode.trim()}`);
    } catch (err) {
      console.error(err);
      setMessage("Invalid room code ❌");
    }
  };

  return (
    <div className="page home-page-bg">
      <Header userName={currentUser} />

      {message && <div className="login-message">{message}</div>}

      <div className="home-top-row">
        <input
          className="input-modern room-code-input"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter room code"
        />

        <button className="btn-primary compact-btn" onClick={joinRoom}>
          Join Room
        </button>

        <button className="btn-primary compact-btn" onClick={createRoomOnly}>
          Create Room
        </button>

        {isAdminUser && (
          <>
            <button className="btn-secondary compact-btn" onClick={() => navigate("/admin")}>
              Admin
            </button>

            <button className="btn-secondary compact-btn" onClick={() => navigate("/admin/users")}>
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
          <MovieCard key={movie.id} movie={movie} onCreateRoom={createRoomFromMovie} />
        ))}
      </div>
    </div>
  );
}