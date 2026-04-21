import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL, buildMediaUrl } from "../api";
import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const stompClientRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [allMovies, setAllMovies] = useState([]);
  const [roomSearch, setRoomSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState("AUTO");
  const [roomError, setRoomError] = useState("");
  const [moviesError, setMoviesError] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  const userName = localStorage.getItem("userName") || "Guest";

  useEffect(() => {
    loadRoom();
    loadMovies();
    connectSocket();

    return () => {
      if (stompClientRef.current) {
        try {
          stompClientRef.current.disconnect(() => {});
        } catch (err) {
          console.error(err);
        }
      }
    };
  }, [roomCode]);

  const loadRoom = async () => {
    try {
      setRoomError("");
      const res = await API.get(`/rooms/${roomCode}`);
      setRoom(res.data || null);
      setSelectedMovie(res.data?.movie || null);
      setSelectedQuality(res.data?.currentQuality || "AUTO");
    } catch (err) {
      console.error(err);
      setRoomError(
        err?.response?.status === 404
          ? "Room not found ❌"
          : "Unable to load room ❌"
      );
    }
  };

  const loadMovies = async () => {
    try {
      setMoviesError("");
      const res = await API.get("/movies");
      setAllMovies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMoviesError("Unable to load movies ❌");
    }
  };

  const connectSocket = () => {
    try {
      const socket = new SockJS(`${API_BASE_URL}/ws`);
      const client = Stomp.over(socket);
      client.debug = () => {};

      client.connect(
        {},
        () => {
          setSocketConnected(true);

          client.subscribe(`/topic/room/${roomCode}`, (message) => {
            const data = JSON.parse(message.body);

            if (!videoRef.current) return;

            if (typeof data.currentTime === "number") {
              const diff = Math.abs((videoRef.current.currentTime || 0) - data.currentTime);
              if (diff > 2) {
                videoRef.current.currentTime = data.currentTime;
              }
            }

            if (data.action === "PLAY") {
              videoRef.current.play().catch(() => {});
            }

            if (data.action === "PAUSE") {
              videoRef.current.pause();
            }

            if (data.action === "RATE" && data.playbackRate) {
              videoRef.current.playbackRate = data.playbackRate;
            }

            if (data.quality) {
              setSelectedQuality(data.quality);
            }
          });

          client.subscribe(`/topic/chat/${roomCode}`, (message) => {
            const data = JSON.parse(message.body);
            setMessages((prev) => [...prev, data]);
          });
        },
        (error) => {
          console.error(error);
          setSocketConnected(false);
        }
      );

      stompClientRef.current = client;
    } catch (err) {
      console.error(err);
      setSocketConnected(false);
    }
  };

  const sendSync = (payload) => {
    if (!stompClientRef.current || !socketConnected) return;

    stompClientRef.current.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        ...payload,
      })
    );
  };

  const sendChat = (text) => {
    if (!stompClientRef.current || !socketConnected || !text.trim()) return;

    stompClientRef.current.send(
      "/app/room.chat",
      {},
      JSON.stringify({
        roomCode,
        sender: userName,
        text,
      })
    );
  };

  const handlePlay = () => {
    sendSync({
      action: "PLAY",
      currentTime: videoRef.current?.currentTime || 0,
      quality: selectedQuality,
    });
  };

  const handlePause = () => {
    sendSync({
      action: "PAUSE",
      currentTime: videoRef.current?.currentTime || 0,
      quality: selectedQuality,
    });
  };

  const goFullScreen = () => {
    if (!videoRef.current) return;

    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    } else if (videoRef.current.msRequestFullscreen) {
      videoRef.current.msRequestFullscreen();
    }
  };

  const handleMovieSwitch = async (movie) => {
    setSelectedMovie(movie);

    try {
      await API.put(`/rooms/${roomCode}/movie`, {
        movieId: movie.id,
      });

      setTimeout(() => loadRoom(), 300);
    } catch (err) {
      console.error(err);
      setRoomError(
        err?.response?.status === 404
          ? "Room movie update API not found ❌"
          : "Unable to switch movie ❌"
      );
    }
  };

  const filteredMovies = useMemo(() => {
    const value = roomSearch.toLowerCase();

    return allMovies.filter(
      (movie) =>
        movie.groupTitle?.toLowerCase().includes(value) ||
        movie.partTitle?.toLowerCase().includes(value) ||
        String(movie.partNumber || "").includes(value)
    );
  }, [allMovies, roomSearch]);

  return (
    <div className="page room-shell">
      <Header userName={userName} />

      <div className="room-topbar">
        <div className="room-code-pill">Room: {roomCode}</div>

        <input
          className="input-modern"
          placeholder="Search movies..."
          value={roomSearch}
          onChange={(e) => setRoomSearch(e.target.value)}
        />

        <button className="btn-secondary room-back-btn" onClick={() => navigate("/home")}>
          Back
        </button>
      </div>

      {roomError && <div className="login-message">{roomError}</div>}
      {moviesError && <div className="login-message">{moviesError}</div>}

      <div className="room-page">
        <div className="room-main-area">
          <div className="room-video-card">
            {selectedMovie ? (
              <>
                <div className="selected-movie-head">
                  <div>
                    <h2>{selectedMovie.groupTitle}</h2>
                    <p>
                      {selectedMovie.partTitle}
                      {selectedMovie.partNumber ? ` • Part ${selectedMovie.partNumber}` : ""}
                    </p>
                  </div>
                  <div className="quality-pill">
                    {selectedQuality} {socketConnected ? "• Live" : "• Offline"}
                  </div>
                </div>

                <div className="player-wrapper">
                  <video
                    ref={videoRef}
                    className="video-player"
                    src={buildMediaUrl(selectedMovie.videoUrl)}
                    controls
                    onPlay={handlePlay}
                    onPause={handlePause}
                  />
                </div>

                <div className="room-action-row">
                  <button className="btn-secondary room-action-btn" onClick={goFullScreen}>
                    Full Screen
                  </button>

                  <a
                    className="download-link"
                    href={buildMediaUrl(selectedMovie.videoUrl)}
                    download
                  >
                    <button className="btn-primary room-action-btn">Download</button>
                  </a>
                </div>
              </>
            ) : (
              <div className="empty-room-box">
                {room
                  ? "Room created successfully. Select a movie below."
                  : "Loading room..."}
              </div>
            )}
          </div>

          <div className="room-parts-card">
            <h3 className="room-section-title">Available Movies</h3>

            {filteredMovies.length === 0 ? (
              <div className="empty-state">No movies found.</div>
            ) : (
              <div className="room-parts-grid">
                {filteredMovies.map((movie) => (
                  <button
                    className={`room-part-item ${
                      selectedMovie?.id === movie.id ? "room-part-active" : ""
                    }`}
                    key={movie.id}
                    onClick={() => handleMovieSwitch(movie)}
                  >
                    <div className="room-part-title">{movie.groupTitle}</div>
                    <div className="room-part-sub">
                      {movie.partTitle}
                      {movie.partNumber ? ` • Part ${movie.partNumber}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ChatBox messages={messages} onSend={sendChat} />
      </div>
    </div>
  );
}