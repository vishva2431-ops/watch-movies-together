import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL } from "../api";
import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const stompClientRef = useRef(null);
  const videoBoxRef = useRef(null);
  const moviesRef = useRef([]);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movies, setMovies] = useState([]);
  const [messages, setMessages] = useState([]);

  const userName = localStorage.getItem("userName") || "Guest";

  useEffect(() => {
    loadRoom();
    loadMovies();
    connectSocket();

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.disconnect(() => {});
      }
    };
  }, [roomCode]);

  const loadRoom = async () => {
    const res = await API.get(`/rooms/${roomCode}`);
    setSelectedMovie(res.data.movie || null);
  };

  const loadMovies = async () => {
    const res = await API.get("/movies");
    setMovies(res.data);
    moviesRef.current = res.data;
  };

  const connectSocket = () => {
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);

    client.debug = () => {};

    client.connect({}, () => {
      client.subscribe(`/topic/room/${roomCode}`, async (message) => {
        const data = JSON.parse(message.body);

        // Movie selection sync
        if (data.action === "SELECT") {
          if (!data.movieId) {
            setSelectedMovie(null);
            return;
          }

          let movie = moviesRef.current.find(
            (m) => m.id === data.movieId
          );

          if (!movie) {
            const res = await API.get("/movies");
            setMovies(res.data);
            moviesRef.current = res.data;

            movie = res.data.find(
              (m) => m.id === data.movieId
            );
          }

          if (movie) {
            setSelectedMovie(movie);
          }

          return;
        }

        if (!videoRef.current) return;

        // Exact time sync
        if (typeof data.currentTime === "number") {
          videoRef.current.currentTime = data.currentTime;
        }

        if (data.action === "PLAY") {
          videoRef.current.play().catch(() => {});
        }

        if (data.action === "PAUSE") {
          videoRef.current.pause();
        }
      });

      client.subscribe(`/topic/chat/${roomCode}`, (message) => {
        const data = JSON.parse(message.body);
        setMessages((prev) => [...prev, data]);
      });
    });

    stompClientRef.current = client;
  };

  const handleMovieChange = async (e) => {
    const movieId = e.target.value;

    if (!movieId) {
      setSelectedMovie(null);

      await API.put(`/rooms/${roomCode}/movie`, {
        movieId: "",
      });

      stompClientRef.current?.send(
        "/app/room.sync",
        {},
        JSON.stringify({
          roomCode,
          action: "SELECT",
          movieId: "",
          currentTime: 0,
        })
      );

      return;
    }

    const movie = moviesRef.current.find(
      (m) => m.id === movieId
    );

    if (!movie) return;

    setSelectedMovie(movie);

    await API.put(`/rooms/${roomCode}/movie`, {
      movieId,
    });

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SELECT",
        movieId,
        currentTime: 0,
      })
    );
  };

  const sendSync = (action) => {
    if (!stompClientRef.current || !videoRef.current) return;

    stompClientRef.current.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action,
        currentTime: videoRef.current.currentTime,
      })
    );
  };

  const sendChat = (text) => {
    if (!stompClientRef.current || !text.trim()) return;

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

  const handleMaximize = () => {
    if (videoBoxRef.current) {
      videoBoxRef.current.requestFullscreen();
    }
  };

  return (
    <div className="page room-shell">
      <Header userName={userName} />

      <div className="room-topbar">
        <div className="room-code-pill">Room: {roomCode}</div>
        <button
          className="back-btn"
          onClick={() => navigate("/home")}
        >
          Back
        </button>
      </div>

      <div className="room-page">
        <div className="room-main-area">
          <div className="room-video-card" ref={videoBoxRef}>
            <div className="room-movie-select">
              <label>Select Movie</label>
              <select
                className="input-modern"
                value={selectedMovie?.id || ""}
                onChange={handleMovieChange}
              >
                <option value="">No movie selected</option>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.groupTitle} - {movie.partTitle}
                  </option>
                ))}
              </select>
            </div>

            {selectedMovie ? (
              <>
                <h2>{selectedMovie.groupTitle}</h2>
                <p>{selectedMovie.partTitle}</p>

                <video
                  ref={videoRef}
                  src={`${API_BASE_URL}/media/drive/${selectedMovie.videoUrl}`}
                  controls
                  width="100%"
                  onPlay={() => sendSync("PLAY")}
                  onPause={() => sendSync("PAUSE")}
                  style={{ borderRadius: "20px" }}
                />

                <button
                  className="btn-secondary"
                  onClick={handleMaximize}
                >
                  ⛶ Maximize
                </button>
              </>
            ) : (
              <div className="empty-room-box">
                <h2>Room created successfully</h2>
                <p>Select a movie to start watching.</p>
              </div>
            )}
          </div>
        </div>

        <ChatBox messages={messages} onSend={sendChat} />
      </div>
    </div>
  );
}