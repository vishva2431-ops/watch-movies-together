import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL, extractYouTubeId } from "../api";
import Header from "../components/Header";
import ChatBox from "../components/ChatBox";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const stompClientRef = useRef(null);
  const playerRef = useRef(null);
  const playerBoxRef = useRef(null);
  const videoContainerRef = useRef(null);
  const moviesRef = useRef([]);
  const ignoreEventRef = useRef(false);
  const lastTapRef = useRef(0);
  const holdTimerRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const isHoldingRef = useRef(false);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movies, setMovies] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playerReady, setPlayerReady] = useState(false);
  const [movieSearch, setMovieSearch] = useState("");
  const [showMovieDropdown, setShowMovieDropdown] = useState(false);
  const [centerIcon, setCenterIcon] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showUsers, setShowUsers] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [showDuration, setShowDuration] = useState(false);

  const userName = localStorage.getItem("userName") || "Guest";

  const filteredMovies = movies.filter((movie) => {
    const value = movieSearch.toLowerCase();

    return (
      movie.groupTitle?.toLowerCase().includes(value) ||
      movie.partTitle?.toLowerCase().includes(value)
    );
  });

  useEffect(() => {
    loadRoom();
    loadMovies();
    connectSocket();
    loadYouTubeScript();

    return () => {
      clearTimeout(singleTapTimerRef.current);
      clearTimeout(holdTimerRef.current);

      if (stompClientRef.current) {
        stompClientRef.current.disconnect(() => { });
      }

      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [roomCode]);

  useEffect(() => {
    if (selectedMovie && window.YT && window.YT.Player) {
      createOrUpdatePlayer(selectedMovie);
    }
  }, [selectedMovie, playerReady]);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);

    return () => {
      document.removeEventListener("fullscreenchange", handler);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadRoom = async () => {
    try {
      const res = await API.get(`/rooms/${roomCode}`);
      const movie = res.data.movie || null;

      setSelectedMovie(movie);
      setRoomUsers(res.data.members || []);

      if (movie) {
        setMovieSearch(`${movie.groupTitle} - ${movie.partTitle}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMovies = async () => {
    try {
      const res = await API.get("/movies");
      setMovies(res.data);
      moviesRef.current = res.data;
    } catch (err) {
      console.error(err);
    }
  };

  const loadYouTubeScript = () => {
    if (window.YT && window.YT.Player) {
      setPlayerReady(true);
      return;
    }

    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      setPlayerReady(true);
    };
  };

  const createOrUpdatePlayer = (movie) => {
    const videoId = extractYouTubeId(movie.videoUrl);

    if (!videoId) return;

    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      setTimeout(() => {
        playerRef.current?.pauseVideo?.();
      }, 500);
      return;
    }

    playerRef.current = new window.YT.Player("youtube-player", {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        controls: 0,
        rel: 0,
        modestbranding: 1,
        disablekb: 1,
        fs: 0,
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
        },
        onStateChange: (event) => {
          if (ignoreEventRef.current) return;

          if (event.data === window.YT.PlayerState.PLAYING) {
            sendSync("PLAY");
          }

          if (event.data === window.YT.PlayerState.PAUSED) {
            sendSync("PAUSE");
          }
        },
      },
    });
  };

  const connectSocket = () => {
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);

    client.debug = () => { };

    client.connect({}, () => {
      client.subscribe(`/topic/room/${roomCode}`, async (message) => {
        const data = JSON.parse(message.body);

        if (data.action === "SELECT") {
          if (!data.movieId) {
            setSelectedMovie(null);
            setMovieSearch("");
            return;
          }

          let movie = moviesRef.current.find((m) => m.id === data.movieId);

          if (!movie) {
            const res = await API.get("/movies");
            setMovies(res.data);
            moviesRef.current = res.data;
            movie = res.data.find((m) => m.id === data.movieId);
          }

          if (movie) {
            setSelectedMovie(movie);
            setMovieSearch(`${movie.groupTitle} - ${movie.partTitle}`);
          }

          return;
        }

        if (!playerRef.current) return;

        ignoreEventRef.current = true;

        if (typeof data.currentTime === "number") {
          playerRef.current.seekTo(data.currentTime, true);
        }

        if (data.playbackRate) {
          playerRef.current.setPlaybackRate(data.playbackRate);
        }

        if (data.action === "PLAY") {
          playerRef.current.playVideo();
        }

        if (data.action === "PAUSE") {
          playerRef.current.pauseVideo();
        }

        if (data.action === "SEEK") {
          playerRef.current.seekTo(data.currentTime, true);
        }

        if (data.action === "SPEED") {
          playerRef.current.setPlaybackRate(data.playbackRate || 1);
        }

        setTimeout(() => {
          ignoreEventRef.current = false;
        }, 600);
      });

      client.subscribe(`/topic/chat/${roomCode}`, (message) => {
        const data = JSON.parse(message.body);
        setMessages((prev) => [...prev, data]);
      });
    });

    stompClientRef.current = client;
  };

  const selectMovie = async (movie) => {
    setSelectedMovie(movie);
    setMovieSearch(`${movie.groupTitle} - ${movie.partTitle}`);
    setShowMovieDropdown(false);

    await API.put(`/rooms/${roomCode}/movie`, {
      movieId: movie.id,
    });

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SELECT",
        movieId: movie.id,
        currentTime: 0,
      })
    );
  };

  const getCurrentTime = () => {
    if (!playerRef.current || !playerRef.current.getCurrentTime) return 0;
    return playerRef.current.getCurrentTime();
  };

  const sendSync = (action, extra = {}) => {
    if (!stompClientRef.current || !playerRef.current) return;

    stompClientRef.current.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action,
        currentTime: getCurrentTime(),
        ...extra,
      })
    );
  };

  const playVideo = () => {
    playerRef.current?.playVideo?.();
    sendSync("PLAY");
  };

  const pauseVideo = () => {
    playerRef.current?.pauseVideo?.();
    sendSync("PAUSE");
  };

  const forward10 = () => {
    const time = getCurrentTime() + 10;
    playerRef.current?.seekTo?.(time, true);
    sendSync("SEEK", { currentTime: time });
  };

  const backward10 = () => {
    const time = Math.max(getCurrentTime() - 10, 0);
    playerRef.current?.seekTo?.(time, true);
    sendSync("SEEK", { currentTime: time });
  };

  const speed2x = () => {
    playerRef.current?.setPlaybackRate?.(2);
    sendSync("SPEED", { playbackRate: 2 });
  };

  const normalSpeed = () => {
    playerRef.current?.setPlaybackRate?.(1);
    sendSync("SPEED", { playbackRate: 1 });
  };

  const showIcon = (icon) => {
    setCenterIcon(icon);
    setTimeout(() => setCenterIcon(""), 700);
  };

  const handleVideoTap = (e) => {
    if (isHoldingRef.current) return;

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const x = clientX - rect.left;

    const isDoubleTap = now - lastTapRef.current < 300;

    if (isDoubleTap) {
      clearTimeout(singleTapTimerRef.current);

      if (x < rect.width / 2) {
        backward10();
        showIcon("⏪");
      } else {
        forward10();
        showIcon("⏩");
      }

      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;

    clearTimeout(singleTapTimerRef.current);

    singleTapTimerRef.current = setTimeout(() => {
      if (lastTapRef.current === 0) return;

      const state = playerRef.current?.getPlayerState?.();

      if (state === window.YT.PlayerState.PLAYING) {
        pauseVideo();
        showIcon("⏸");
      } else {
        playVideo();
        showIcon("▶");
      }

      lastTapRef.current = 0;
    }, 320);
  };

  const handleHoldStart = () => {
    isHoldingRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      speed2x();
      showIcon("2x");
    }, 450);
  };

  const handleHoldEnd = () => {
    clearTimeout(holdTimerRef.current);

    if (isHoldingRef.current) {
      normalSpeed();
      setTimeout(() => {
        isHoldingRef.current = false;
      }, 100);
    }
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

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await videoContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(
      roomCode
    );
  };
  const shareRoomLink = async () => {
    const link =
      `${window.location.origin}/room/${roomCode}`;

    await navigator.clipboard.writeText(
      link
    );
  };
  return (
    <div className="page room-shell">
      <Header userName={userName} />

      <div className="room-topbar">
        <div className="room-code-pill">Room: {roomCode}</div>

        <button
          className="room-users-btn"
          onClick={() => setShowUsers(true)}
        >
          👥 {roomUsers.length}
        </button>

        <button className="back-btn" onClick={() => navigate("/home")}>
          Back
        </button>
        {/* <button
          className="btn-secondary"
          onClick={copyRoomCode}
        >
          Copy Code
        </button> */}
        {/* <button
          className="btn-secondary"
          onClick={shareRoomLink}
        >
          Share Link
        </button> */}
      </div>

      <div className="room-page">
        <div className="room-main-area">
          <div className="room-video-card" ref={playerBoxRef}>
            <div className="room-movie-select movie-search-wrap">
              <label>Search YouTube Video</label>

              <input
                className="input-modern"
                placeholder="Search for movies..."
                value={movieSearch}
                onChange={(e) => {
                  setMovieSearch(e.target.value);
                  setShowMovieDropdown(true);
                }}
                onFocus={() => setShowMovieDropdown(true)}
              />

              {showMovieDropdown && (
                <div className="movie-search-dropdown">
                  {filteredMovies.length === 0 ? (
                    <div className="movie-search-empty">Search for movies</div>
                  ) : (
                    filteredMovies.map((movie) => (
                      <div
                        key={movie.id}
                        className="movie-search-option"
                        onClick={() => selectMovie(movie)}
                      >
                        {movie.groupTitle} - {movie.partTitle}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedMovie ? (
              <>
                <h2>{selectedMovie.groupTitle}</h2>
                <p>{selectedMovie.partTitle}</p>

                <div ref={videoContainerRef} className="youtube-touch-frame">
                  <div id="youtube-player"></div>
                  <div
                    className="video-touch-layer"
                    onClick={handleVideoTap}
                    onMouseDown={handleHoldStart}
                    onMouseUp={handleHoldEnd}
                    onMouseLeave={handleHoldEnd}
                    onTouchStart={handleHoldStart}
                    onTouchEnd={handleHoldEnd}
                  />

                  <div
                    className="video-bottom-touch"
                    onMouseMove={() => setShowDuration(true)}
                    onTouchStart={() => setShowDuration(true)}
                  />

                  <div className={`video - center - icon ${centerIcon ? "show" : ""}`}>
                  {centerIcon}
                </div>

                {showDuration && (
                  <>
                    <div className="video-progress">
                      <div
                        className="video-progress-fill"
                        style={{
                          width:
                            duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
          }}
        />
                    </div>

                    <div className="video-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </>
                )}
              </div>

            <button className="btn-secondary" onClick={toggleFullscreen}>
              {isFullscreen ? "Minimize" : "Maximize"}
            </button>
          </>
          ) : (
          <div className="empty-room-box">
            <h2>Room created successfully</h2>
            <p>Search and select a YouTube video to start watching.</p>
          </div>
            )}
        </div>
      </div>

      {showUsers && (
        <div className="users-modal">
          <div className="users-box">
            <h3>Room Members</h3>

            {roomUsers.length === 0 ? (
              <p>No users connected</p>
            ) : (
              roomUsers.map((user, index) => (
                <div key={index} className="user-row">
                  👤 {user}
                </div>
              ))
            )}

            <button className="btn-primary" onClick={() => setShowUsers(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <ChatBox messages={messages} onSend={sendChat} />
    </div>
    </div >
  );
}