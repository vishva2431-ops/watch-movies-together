import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL, getMoviePreview, getMovieVideo } from "../api";
import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const stompClientRef = useRef(null);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movies, setMovies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [usePreview, setUsePreview] = useState(false);

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
  };

  const connectSocket = () => {
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);
    client.debug = () => {};

    client.connect({}, () => {
      client.subscribe(`/topic/room/${roomCode}`, (message) => {
        const data = JSON.parse(message.body);

        if (!videoRef.current || usePreview) return;

        if (typeof data.currentTime === "number") {
          const diff = Math.abs(videoRef.current.currentTime - data.currentTime);
          if (diff > 2) videoRef.current.currentTime = data.currentTime;
        }

        if (data.action === "PLAY") videoRef.current.play().catch(() => {});
        if (data.action === "PAUSE") videoRef.current.pause();
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
      await API.put(`/rooms/${roomCode}/movie`, { movieId: "" });
      return;
    }

    const movie = movies.find((m) => m.id === movieId);
    setSelectedMovie(movie);
    setUsePreview(false);

    await API.put(`/rooms/${roomCode}/movie`, { movieId });
  };

  const sendSync = (action) => {
    if (!stompClientRef.current || !videoRef.current || usePreview) return;

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

  return (
    <div className="page room-shell">
      <Header userName={userName} />

      <div className="room-topbar">
        <div className="room-code-pill">Room: {roomCode}</div>
        <button className="back-btn" onClick={() => navigate("/home")}>Back</button>
      </div>

      <div className="room-page">
        <div className="room-main-area">
          <div className="room-video-card">
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

                {!usePreview ? (
                  <video
                    ref={videoRef}
                    src={getMovieVideo(selectedMovie)}
                    controls
                    onPlay={() => sendSync("PLAY")}
                    onPause={() => sendSync("PAUSE")}
                    onError={() => setUsePreview(true)}
                  />
                ) : (
                  <iframe
                    title={selectedMovie.groupTitle}
                    src={getMoviePreview(selectedMovie)}
                    width="100%"
                    height="500"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                )}

                <button
                  className="btn-secondary"
                  onClick={() => setUsePreview(!usePreview)}
                >
                  {usePreview ? "Use Sync Player" : "Use Google Drive Preview"}
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