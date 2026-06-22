import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL, extractYouTubeId } from "../api";
import Header from "../components/Header";
import ChatBox from "../components/ChatBox";
import {
  FaPlay,
  FaPause,
  FaForward,
  FaBackward,
  FaExpand,
  FaBolt
} from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { FiShare2 } from "react-icons/fi";
// import {
//   HiOutlineClipboardDocument,
//   HiOutlineShare
// } from "react-icons/hi2";

export default function RoomPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const stompClientRef = useRef(null);
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const moviesRef = useRef([]);
  const ignoreEventRef = useRef(false);
  const lastTapRef = useRef(0);
  const holdTimerRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const durationTimerRef = useRef(null);
  const lastShortScrollRef = useRef(0);
  const youtubeBoxRef = useRef(null);
  const lastRoomStateRef = useRef({
    action: "PAUSE",
    currentTime: 0,
    playbackRate: 1,
  });
  const selectedMovieRef = useRef(null);
  const activeCategoryRef = useRef("MOVIE");
  const playedReelsRef = useRef([]);
  const reelHistoryRef = useRef([]);
  const reelBackHistoryRef = useRef([]);
  const reelForwardHistoryRef = useRef([]);


  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movies, setMovies] = useState([]);
  // const [messages, setMessages] = useState([]);
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
  const [playing, setPlaying] = useState(false);
  const [shortsFeed, setShortsFeed] = useState([]);
  const [shortIndex, setShortIndex] = useState(0);
  const touchStartYRef = useRef(0);
  const [roomYoutubeResults, setRoomYoutubeResults] = useState([]);
  const [roomYoutubeLoading, setRoomYoutubeLoading] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [roomNotification, setRoomNotification] = useState("");
  // const [showHeart, setShowHeart] = useState(false);
  const [floatingComments, setFloatingComments] = useState([]);
  const [showReelCommentBox, setShowReelCommentBox] = useState(false);
  const [reelComment, setReelComment] = useState("");
  // const [reelLiked, setReelLiked] = useState(false);

  const chatStorageKey = `chat_${roomCode}`;

  const savedName = localStorage.getItem("userName");

  const userName =
    savedName && savedName !== "undefined" && savedName !== "null"
      ? savedName
      : "Guest";

  const userNameRef = useRef(userName);

  useEffect(() => {
    userNameRef.current = localStorage.getItem("userName") || userName;
  }, [userName]);

  const [activeCategory, setActiveCategory] = useState(
    sessionStorage.getItem(`tab_${roomCode}`) || "MOVIE"
  );

  const filteredMovies = movies.filter((movie) => {
    const value = movieSearch.toLowerCase();

    return (
      (movie.category || "MOVIE") === activeCategory &&
      (
        movie.groupTitle?.toLowerCase().includes(value) ||
        movie.partTitle?.toLowerCase().includes(value)
      )
    );
  });

  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(`chat_${roomCode}`);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const savedMovie =
      sessionStorage.getItem(
        `selected_${roomCode}`
      );

    if (savedMovie) {
      setSelectedMovie(
        JSON.parse(savedMovie)
      );
    }
  }, [roomCode]);

  useEffect(() => {
    sessionStorage.setItem(
      `tab_${roomCode}`,
      activeCategory
    );
  }, [activeCategory, roomCode]);

  // useEffect(() => {
  //   const savedMovie = sessionStorage.getItem(
  //     `selected_${roomCode}`
  //   );

  //   if (savedMovie) {
  //     setSelectedMovie(JSON.parse(savedMovie));
  //   }
  // }, [roomCode]);

  useEffect(() => {
    loadRoom();
    loadMovies();
    connectSocket();
    loadYouTubeScript();

    return () => {
      sendUserLeave();

      clearTimeout(singleTapTimerRef.current);
      clearTimeout(holdTimerRef.current);
      clearTimeout(durationTimerRef.current);

      if (stompClientRef.current) {
        stompClientRef.current.disconnect(() => { });
        stompClientRef.current = null;
      }

      // Do not destroy YouTube player here
      playerRef.current = null;
    };
  }, [roomCode]);

  useEffect(() => {
    const savedFeed = sessionStorage.getItem("shortsFeed");
    const startVideoId = sessionStorage.getItem("shortsStartVideoId");

    if (!savedFeed) return;

    const parsedFeed = JSON.parse(savedFeed);
    setShortsFeed(parsedFeed);

    const startIndex = parsedFeed.findIndex(
      (item) => item.videoId === startVideoId
    );

    if (startIndex >= 0) {
      setShortIndex(startIndex);
    }
  }, []);

  useEffect(() => {
    selectedMovieRef.current = selectedMovie;
  }, [selectedMovie]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    if (!selectedMovie && roomYoutubeResults.length === 0 && !roomYoutubeLoading) {
      if (activeCategory === "MOVIE") {
        loadTamilMovies();
      } else if (activeCategory === "MUSIC") {
        loadTamilMusic();
      } else if (activeCategory === "SHORT") {
        loadTamilReels();
      }
    }
  }, [activeCategory, selectedMovie]);

  useEffect(() => {
    if (activeCategory === "SHORT") {
      document.body.classList.add("short-mode");
    } else {
      document.body.classList.remove("short-mode");
    }

    return () => {
      document.body.classList.remove("short-mode");
    };
  }, [activeCategory]);

  const handleReelWheel = (e) => {
    if (activeCategory !== "SHORT") return;
    if (!selectedMovie) return;

    if (Math.abs(e.deltaY) < 20) return;

    const now = Date.now();
    if (now - lastShortScrollRef.current < 700) return;

    lastShortScrollRef.current = now;

    if (e.deltaY > 0) {
      nextShort();
    } else {
      previousShort();
    }
  };

  useEffect(() => {
    if (selectedMovie && window.YT && window.YT.Player) {
      createOrUpdatePlayer(selectedMovie);
    }
  }, [selectedMovie, playerReady]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      `chat_${roomCode}`,
      JSON.stringify(messages)
    );
  }, [messages, roomCode]);

  useEffect(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, [activeCategory]);

  // useEffect(() => {
  //   if (activeCategory !== "SHORT") return;
  //   if (!selectedMovie) return;
  //   if (!playerReady) return;

  //   setTimeout(() => {
  //     playerRef.current?.loadVideoById?.(selectedMovie.videoUrl);
  //     playerRef.current?.playVideo?.();
  //   }, 700);
  // }, [selectedMovie, playerReady, activeCategory]);

  const loadRoom = async () => {
    try {
      const res = await API.get(`/rooms/${roomCode}`);
      const roomData = res.data;
      if (!roomData.movie && !roomData.youtubeVideoId && roomData.category === "SHORT") {
        setActiveCategory("SHORT");
        loadTamilReels();
        return;
      }

      if (roomData.movie) {
        setActiveCategory(roomData.movie.category || "MOVIE");
        setSelectedMovie(roomData.movie);
        setMovieSearch(
          `${roomData.movie.groupTitle} - ${roomData.movie.partTitle}`
        );
      }
      else if (roomData.youtubeVideoId) {
        const cat = roomData.category || "MOVIE";

        setActiveCategory(cat);

        if (cat === "SHORT") {
          setSelectedMovie(null);
          sessionStorage.removeItem(`selected_${roomCode}`);
          loadTamilReels();
          return;
        }

        setSelectedMovie({
          id: roomData.youtubeVideoId,
          videoUrl: roomData.youtubeVideoId,
          groupTitle: roomData.youtubeTitle,
          partTitle: cat,
          youtube: true,
        });

        setMovieSearch("");
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

      // DON'T overwrite YouTube reels feed here
      // setShortsFeed(res.data.filter((m) => m.category === "SHORT"));
    } catch (err) {
      console.error(err);
    }
  };
  // const savedFeed = sessionStorage.getItem("shortsFeed");
  // const startVideoId = sessionStorage.getItem("shortsStartVideoId");

  // if (savedFeed) {
  //   const parsedFeed = JSON.parse(savedFeed);

  //   setShortsFeed(parsedFeed);

  //   const startIndex = parsedFeed.findIndex(
  //     (item) => item.videoId === startVideoId
  //   );

  //   if (startIndex >= 0) {
  //     setCurrentShortIndex(startIndex);
  //   }
  // }

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

    window.onYouTubeIframeAPIReady = () => setPlayerReady(true);
  };

  const createOrUpdatePlayer = (movie) => {
    const videoId = extractYouTubeId(movie.videoUrl) || movie.videoUrl;
    if (!videoId || !window.YT?.Player) return;

    setTimeout(() => {
      const box = youtubeBoxRef.current;
      if (!box) return;

      const iframeStillExists =
        playerRef.current?.getIframe?.() &&
        document.body.contains(playerRef.current.getIframe());

      if (playerRef.current?.loadVideoById && iframeStillExists) {
        playerRef.current.loadVideoById(videoId);
        setTimeout(() => {
          playerRef.current?.playVideo?.();
          setDuration(playerRef.current?.getDuration?.() || 0);
        }, 100);
        return;
      }

      playerRef.current = null;
      box.innerHTML = `<div id="youtube-player"></div>`;
      playerRef.current = new window.YT.Player("youtube-player", {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            playerRef.current = event.target;
            setPlayerReady(true);
            const savedState = lastRoomStateRef.current;

            setTimeout(() => {
              if (!playerRef.current) return;

              playerRef.current.seekTo(savedState.currentTime || 0, true);
              playerRef.current.setPlaybackRate?.(savedState.playbackRate || 1);

              if (savedState.action === "PLAY") {
                playerRef.current.playVideo();
              }
            }, 250);

            setTimeout(() => {
              const dur = playerRef.current?.getDuration?.();
              if (typeof dur === "number" && !Number.isNaN(dur)) {
                setDuration(dur);
              }
            }, 500);
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setPlaying(true);
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false);
            }

            const dur = playerRef.current?.getDuration?.();

            if (typeof dur === "number" && !Number.isNaN(dur)) {
              setDuration(dur);
            }
          },
        },
      });
    }, 150);
  };

  const addRoomUser = (name) => {
    if (!name) return;
    setRoomUsers((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  };

  const removeRoomUser = (name) => {
    setRoomUsers((prev) => prev.filter((u) => u !== name));
  };

  const getSafeUserName = () => {
    return localStorage.getItem("userName") || userNameRef.current;
  };

  const sendUserJoin = () => {
    const name = getSafeUserName();

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_JOIN",
        userName: name,
      })
    );

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SYNC_REQUEST",
        userName: name,
      })
    );
  };

  const sendUserLeave = () => {
    const name = getSafeUserName();

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_LEAVE",
        userName: name,
      })
    );
  };

  const requestUsers = () => {
    const name = getSafeUserName();

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_REQUEST",
        userName: name,
      })
    );
  };

  const connectSocket = () => {
    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);

    client.debug = () => { };

    client.connect({}, () => {
      stompClientRef.current = client;

      client.subscribe(`/topic/room/${roomCode}`, async (message) => {
        const data = JSON.parse(message.body);

        if (data.action === "REEL_COMMENT") {
          const comment = {
            id: Date.now(),
            user: data.userName,
            text: data.comment,
          };

          setFloatingComments((prev) => [...prev, comment]);

          setTimeout(() => {
            setFloatingComments((prev) =>
              prev.filter((c) => c.id !== comment.id)
            );
          }, 3000);

          return;
        }

        // if (data.action === "REEL_LIKE") {
        //   setShowHeart(true);

        //   showRoomNotification(`💜 ${data.userName} liked this reel`);

        //   setTimeout(() => {
        //     setShowHeart(false);
        //   }, 1100);

        //   return;
        // }

        if (data.action === "USER_JOIN") {

          addRoomUser(data.userName);

          if (data.userName !== getSafeUserName()) {

            const joinName =
              data.userName &&
                data.userName !== "undefined" &&
                data.userName !== "null"
                ? data.userName
                : getSafeUserName();

            showRoomNotification(`${joinName} joined the room`);
          }

          return;
          // console.log("JOIN MESSAGE =", data);
        }

        if (data.action === "USER_LEAVE") {

          removeRoomUser(data.userName);

          if (data.userName !== getSafeUserName()) {

            const leaveName =
              data.userName &&
                data.userName !== "undefined" &&
                data.userName !== "null"
                ? data.userName
                : getSafeUserName();

            showRoomNotification(`${leaveName} left the room`);
          }

          return;
        }
        if (
          data.action === "USER_REQUEST" &&
          data.userName !== userName
        ) {
          sendUserJoin();
          return;
        }

        // ✅ ADD THIS BEFORE SELECT
        if (data.action === "SYNC_REQUEST") {
          const currentMovie = selectedMovieRef.current;
          const currentCategory = activeCategoryRef.current;

          if (!currentMovie || !playerRef.current) return;
          stompClientRef.current?.send(
            "/app/room.sync",
            {},
            JSON.stringify({
              roomCode,
              action: "SYNC_RESPONSE",
              targetUser: data.userName,
              userName,
              youtubeVideoId: currentMovie.youtube ? currentMovie.videoUrl : null,
              youtubeTitle: currentMovie.groupTitle,
              movieId: currentMovie.youtube ? null : currentMovie.id,
              category: currentCategory,
              currentTime: playerRef.current.getCurrentTime?.() || 0,
              playbackRate: playerRef.current.getPlaybackRate?.() || 1,
              playing:
                playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING,
            })
          );

          return;
        }

        if (data.action === "SYNC_RESPONSE") {
          if (data.targetUser !== userName) return;

          lastRoomStateRef.current = {
            action: data.playing ? "PLAY" : "PAUSE",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };

          if (data.youtubeVideoId) {
            const youtubeMovie = {
              id: data.youtubeVideoId,
              videoUrl: data.youtubeVideoId,
              groupTitle: data.youtubeTitle,
              partTitle: data.category,
              youtube: true,
            };

            setSelectedMovie(youtubeMovie);
            setActiveCategory(data.category || "MOVIE");

            if ((data.category || "MOVIE") !== "SHORT") {
              sessionStorage.setItem(
                `selected_${roomCode}`,
                JSON.stringify(youtubeMovie)
              );
            } else {
              sessionStorage.removeItem(`selected_${roomCode}`);
            }
          }

          return;
        }

        if (data.action === "SELECT") {
          lastRoomStateRef.current = {
            action: "PLAY",
            currentTime: 0,
            playbackRate: 1,
          };

          if (!data.movieId && !data.youtubeVideoId) {
            setSelectedMovie(null);
            setMovieSearch("");
            return;
          }

          if (data.youtubeVideoId) {
            const youtubeMovie = {
              id: data.youtubeVideoId,
              videoUrl: data.youtubeVideoId,
              groupTitle: data.youtubeTitle,
              partTitle: data.category,
              youtube: true,
            };

            setActiveCategory(data.category || "MOVIE");
            setSelectedMovie(youtubeMovie);

            if ((data.category || "MOVIE") !== "SHORT") {
              sessionStorage.setItem(
                `selected_${roomCode}`,
                JSON.stringify(youtubeMovie)
              );
            } else {
              sessionStorage.removeItem(`selected_${roomCode}`);
            }

            setMovieSearch("");

            setTimeout(() => {
              playerRef.current?.playVideo?.();
            }, 800);

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
            setMovieSearch("");
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

          lastRoomStateRef.current = {
            action: "PLAY",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };
        }

        if (data.action === "PAUSE") {
          playerRef.current.pauseVideo();

          lastRoomStateRef.current = {
            action: "PAUSE",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };
        }

        if (data.action === "SEEK") {
          playerRef.current.seekTo(data.currentTime, true);
          setCurrentTime(data.currentTime);

          lastRoomStateRef.current = {
            action: "SEEK",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };
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

      addRoomUser(userName);
      sendUserJoin();
      requestUsers();
    });

  };

  const selectMovie = async (movie) => {
    setSelectedMovie(movie);
    setMovieSearch(`${movie.groupTitle} - ${movie.partTitle}`);
    setShowMovieDropdown(false);
    setActiveCategory(movie.category || "MOVIE");

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
    if (!playerRef.current?.getCurrentTime) return 0;
    return playerRef.current.getCurrentTime();
  };

  const sendSync = (action, extra = {}) => {
    if (!stompClientRef.current || !playerRef.current) return;
    lastRoomStateRef.current = {
      action,
      currentTime: getCurrentTime(),
      playbackRate: extra.playbackRate || playerRef.current.getPlaybackRate?.() || 1,
    };

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
    if (!isPlayerReady()) return;

    playerRef.current.playVideo();
    sendSync("PLAY");
  };

  const pauseVideo = () => {
    if (!isPlayerReady()) return;

    playerRef.current.pauseVideo();
    sendSync("PAUSE");
  };

  const seekToTime = (newTime) => {
    if (!isPlayerReady()) return;

    const total = playerRef.current.getDuration?.() || duration || 0;
    const safeTime = total
      ? Math.min(Math.max(newTime, 0), total - 1)
      : Math.max(newTime, 0);

    const wasPlaying =
      playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING;

    playerRef.current.seekTo(safeTime, true);
    setCurrentTime(safeTime);

    sendSync("SEEK", { currentTime: safeTime });

    setTimeout(() => {
      if (!isPlayerReady()) return;

      if (wasPlaying) {
        playerRef.current.playVideo();
        sendSync("PLAY", { currentTime: safeTime });
      }
    }, 250);
  };

  const forward10 = () => {
    if (!isPlayerReady()) return;

    const current = playerRef.current.getCurrentTime();
    const duration = playerRef.current.getDuration();

    const newTime = Math.min(current + 10, duration - 1);

    playerRef.current.seekTo(newTime, true);

    setCurrentTime(newTime);

    sendSync("SEEK", {
      currentTime: newTime,
    });

    setTimeout(() => {
      playerRef.current.playVideo();
    }, 300);
  };
  const backward10 = () => {
    if (!isPlayerReady()) return;

    const current = playerRef.current.getCurrentTime();

    const newTime = Math.max(current - 10, 0);

    playerRef.current.seekTo(newTime, true);

    setCurrentTime(newTime);

    sendSync("SEEK", {
      currentTime: newTime,
    });

    setTimeout(() => {
      playerRef.current.playVideo();
    }, 300);
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

  const showDurationTemporarily = () => {
    setShowDuration(true);
    clearTimeout(durationTimerRef.current);
    durationTimerRef.current = setTimeout(() => {
      setShowDuration(false);
    }, 4000);
  };

  const handleVideoTap = (e) => {
    if (isHoldingRef.current) return;

    showDurationTemporarily();

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const x = clientX - rect.left;

    const isDoubleTap = now - lastTapRef.current < 300;

    clearTimeout(singleTapTimerRef.current);

    if (isDoubleTap) {
      lastTapRef.current = 0;

      if (x < rect.width * 0.35) {
        backward10();
      } else if (x > rect.width * 0.65) {
        forward10();
      }

      return;
    }

    lastTapRef.current = now;

    singleTapTimerRef.current = setTimeout(() => {
      showDurationTemporarily();
      lastTapRef.current = 0;
    }, 300);
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

  const seekByProgress = (e) => {
    e.stopPropagation();
    if (!duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const seekTime = duration * percent;

    const wasPlaying =
      playerRef.current?.getPlayerState?.() === window.YT.PlayerState.PLAYING;

    playerRef.current?.seekTo?.(seekTime, true);
    setCurrentTime(seekTime);
    sendSync("SEEK", { currentTime: seekTime });

    if (wasPlaying) {
      setTimeout(() => {
        playerRef.current?.playVideo?.();
        sendSync("PLAY", { currentTime: seekTime });
      }, 200);
    }

    showDurationTemporarily();
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
        replyTo: replyTo
          ? {
            sender: replyTo.sender,
            text: replyTo.text,
          }
          : null,
      })
    );

    setReplyTo(null);
  };

  const toggleFullscreen = async () => {
    const container = videoContainerRef.current;

    if (!container) return;

    try {
      if (!document.fullscreenElement) {

        await container.requestFullscreen();

        // Only Movie & Music => Landscape
        if (
          activeCategory === "MOVIE" ||
          activeCategory === "MUSIC"
        ) {
          if (screen.orientation?.lock) {
            try {
              await screen.orientation.lock("landscape");
            } catch (err) {
              console.log("Landscape lock not supported");
            }
          }
        }

        setIsFullscreen(true);

      } else {

        if (screen.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch (err) {
            console.log("Orientation unlock not supported");
          }
        }

        await document.exitFullscreen();

        setIsFullscreen(false);
      }

    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const togglePlay = () => {
    if (!isPlayerReady()) return;

    const state = playerRef.current.getPlayerState();

    if (state === window.YT.PlayerState.PLAYING) {
      pauseVideo();
      setPlaying(false);
    } else {
      playVideo();
      setPlaying(true);
    }
  };

  const getShortFeed = () => {
    return shortsFeed.length > 0 ? shortsFeed : roomYoutubeResults;
  };

  const syncSelectedShort = (shortVideo) => {
    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SELECT",
        youtubeVideoId: shortVideo.videoId,
        youtubeTitle: shortVideo.title,
        youtubeThumbnail: shortVideo.thumbnail,
        category: "SHORT",
        currentTime: 0,
      })
    );
  };

  const nextShort = () => {
    const feed = shortsFeed.length > 0 ? shortsFeed : roomYoutubeResults;
    if (feed.length === 0) return;

    let nextIndex;

    if (reelForwardHistoryRef.current.length > 0) {
      nextIndex = reelForwardHistoryRef.current.pop();
    } else {
      reelBackHistoryRef.current.push(shortIndex);

      do {
        nextIndex = Math.floor(Math.random() * feed.length);
      } while (feed.length > 1 && nextIndex === shortIndex);
    }

    setShortIndex(nextIndex);
    // setReelLiked(false);
    const nextVideo = feed[nextIndex];

  selectYoutubeVideo(nextVideo, true, "SHORT");
  };

  const previousShort = () => {
    const feed = shortsFeed.length > 0 ? shortsFeed : roomYoutubeResults;
    if (feed.length === 0) return;

    const prevIndex = reelBackHistoryRef.current.pop();
    if (prevIndex === undefined) return;

    reelForwardHistoryRef.current.push(shortIndex);

    setShortIndex(prevIndex);
    // setReelLiked(false);
    const prevVideo = feed[prevIndex];

   selectYoutubeVideo(prevVideo, true, "SHORT");
  };

  const handleShortTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleShortTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - endY;

    if (Math.abs(diff) < 120) return;

    if (diff > 0) {
      nextShort();
    } else {
      previousShort();
    }
  };

  const isPlayerReady = () => {
    return (
      playerRef.current &&
      playerRef.current.getIframe &&
      document.body.contains(playerRef.current.getIframe()) &&
      typeof playerRef.current.playVideo === "function" &&
      typeof playerRef.current.pauseVideo === "function" &&
      typeof playerRef.current.seekTo === "function"
    );
  };

  const getRandomShortIndex = (feed) => {
    if (feed.length === 0) return 0;

    const available = feed
      .map((_, i) => i)
      .filter((i) => !playedReelsRef.current.includes(i));

    if (available.length === 0) {
      playedReelsRef.current = [];
      return Math.floor(Math.random() * feed.length);
    }

    const randomIndex =
      available[Math.floor(Math.random() * available.length)];

    playedReelsRef.current.push(randomIndex);

    return randomIndex;
  };

  const searchYoutubeInsideRoom = async () => {
    if (!movieSearch.trim()) return;

    try {
      setRoomYoutubeLoading(true);

      const res = await API.get("/youtube/search", {
        params: {
          q: movieSearch.trim(),
          category: activeCategory,
        },
      });

      playerRef.current?.destroy?.();
      playerRef.current = null;

      if (youtubeBoxRef.current) {
        youtubeBoxRef.current.innerHTML = "";
      }

      setSelectedMovie(null);
      sessionStorage.removeItem(`selected_${roomCode}`);

      setRoomYoutubeResults(res.data);
      setMovieSearch("");

      if (activeCategory === "SHORT") {
        setShortsFeed(res.data);
        setShortIndex(0);
      }
    } finally {
      setRoomYoutubeLoading(false);
    }
  };
  const selectYoutubeVideo = async (
    video,
    keepFeed = false,
    forcedCategory = activeCategory
  ) => {
    const youtubeMovie = {
      id: video.videoId,
      videoUrl: video.videoId,
      groupTitle: video.title,
      partTitle: forcedCategory,
      youtube: true,
    };

    setSelectedMovie(youtubeMovie);

    if (forcedCategory !== "SHORT") {
      sessionStorage.setItem(
        `selected_${roomCode}`,
        JSON.stringify(youtubeMovie)
      );
    } else {
      sessionStorage.removeItem(`selected_${roomCode}`);
    }

    setActiveCategory(forcedCategory);
    setMovieSearch("");
    setShowMovieDropdown(false);

    if (!keepFeed) {
      setRoomYoutubeResults([]);
    }

    await API.put(`/rooms/${roomCode}/movie`, {
      youtubeVideoId: video.videoId,
      youtubeTitle: video.title,
      youtubeThumbnail: video.thumbnail,
      category: forcedCategory,
    });

    lastRoomStateRef.current = {
      action: "PLAY",
      currentTime: 0,
      playbackRate: 1,
    };

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SELECT",
        youtubeVideoId: video.videoId,
        youtubeTitle: video.title,
        youtubeThumbnail: video.thumbnail,
        category: forcedCategory,
        currentTime: 0,
      })
    );
  };

  const loadTamilMovies = async () => {
    try {
      setRoomYoutubeLoading(true);

      const queries = [
        "latest released tamil full movie",
        "new tamil full movie hd",
        "latest tamil dubbed full movie",
        "new tamil dubbed full movie hd",
        "tamil web series full episodes",
        "tamil dubbed web series full episodes",
        "latest tamil webseries full episode",
        "latest tamil dubbed webseries full episode"
      ];
      const randomQuery =
        queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get("/youtube/search", {
        params: {
          q: randomQuery,
          category: "MOVIE",
        },
      });

      setRoomYoutubeResults(res.data);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const loadTamilMusic = async () => {
    try {
      setRoomYoutubeLoading(true);
      const res = await API.get("/youtube/search", {
        params: {
          q: "latest tamil official music video new tamil songs",
          category: "MUSIC",
        },
      });
      setRoomYoutubeResults(res.data);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const loadTamilReels = async () => {
    try {
      setRoomYoutubeLoading(true);

      const queries = [
        "tamil love reels",
        "tamil couple reels",
        "tamil friendship reels",
        "tamil food vlog shorts",
        "tamil travel vlog shorts",
        "tamil comedy reels",
        "tamil couple vlog shorts"
      ];

      const randomQuery =
        queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get("/youtube/search", {
        params: {
          q: randomQuery,
          category: "SHORT",
        },
      });

      const blockedWords = [
        "news",
        "politics",
        "election",
        "breaking",
        "live news",
        "muslim",
        "islam",
        "bjp",
        "congress",
        "bangla",
        "bengali",
        "hindi",
        "urdu",
        "punjabi",
        "telugu",
        "malayalam",
        "kannada",
        "bhojpuri"
      ];

      const tamilKeywords = [
        "tamil",
        "tamizh",
        "kollywood",
        "love",
        "couple",
        "friend",
        "friendship",
        "comedy",
        "vlog",
        "food",
        "travel"
      ];

      const filtered = res.data.filter((video) => {
        const text =
          `${video.title || ""} ${video.description || ""}`.toLowerCase();

        const allowed =
          tamilKeywords.some((word) => text.includes(word));

        const blocked =
          blockedWords.some((word) => text.includes(word));

        return allowed && !blocked;
      });

      const shuffled = [...filtered].sort(
        () => Math.random() - 0.5
      );

      setRoomYoutubeResults(shuffled);
      setShortsFeed(shuffled);
      setShortIndex(0);
      setSelectedMovie(null);
      setMovieSearch("");

    } catch (err) {
      console.error(err);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const goBack = () => {
    if (selectedMovie) {
      playerRef.current?.destroy?.();
      playerRef.current = null;

      if (youtubeBoxRef.current) {
        youtubeBoxRef.current.innerHTML = "";
      }

      setSelectedMovie(null);
      setMovieSearch("");
      sessionStorage.removeItem(`selected_${roomCode}`);

      setTimeout(() => {
        if (activeCategory === "SHORT") {
          loadTamilReels();
        } else if (activeCategory === "MUSIC") {
          loadTamilMusic();
        } else {
          loadTamilMovies();
        }
      }, 100);

      return;
    }

    navigate(-1);
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);

      setCopyMessage("Room ID copied ✨");

      setTimeout(() => {
        setCopyMessage("");
      }, 1800);
    } catch (err) {
      setCopyMessage("Unable to copy room ID");
      setTimeout(() => setCopyMessage(""), 1800);
    }
  };

  const shareRoomLink = async () => {
    const roomLink = `${window.location.origin}/room/${roomCode}`;

    if (navigator.share) {
      await navigator.share({
        title: "Join the Vision ARC",
        text: `Join the Vision Arc room: ${roomCode}`,
        url: roomLink,
      });
    } else {
      await navigator.clipboard.writeText(roomLink);
      alert("Share is not supported. Room link copied instead.");
    }
  };

  const showRoomNotification = (msg) => {
    setRoomNotification(msg);

    setTimeout(() => {
      setRoomNotification("");
    }, 2000);
  };

  const sendMessage = (text) => {
    if (!stompClientRef.current) return;

    stompClientRef.current.send(
      "/app/chat.send",
      {},
      JSON.stringify({
        roomCode,
        sender: userName,
        text,
        replyTo: replyTo
          ? {
            sender: replyTo.sender,
            text: replyTo.text,
          }
          : null,
      })
    );
  };

  // const sendReelLike = () => {
  //   setReelLiked(true);
  //   setShowHeart(true);

  //   stompClientRef.current?.send(
  //     "/app/room.sync",
  //     {},
  //     JSON.stringify({
  //       roomCode,
  //       action: "REEL_LIKE",
  //       userName
  //     })
  //   );

  //   setTimeout(() => {
  //     setShowHeart(false);
  //   }, 1100);
  // };

  const sendReelComment = () => {
    if (!reelComment.trim()) return;

    // const comment = {
    //   id: Date.now(),
    //   user: userName,
    //   text: reelComment,
    // };

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "REEL_COMMENT",
        userName,
        comment: reelComment,
      })
    );
    setTimeout(() => {
      setFloatingComments((prev) =>
        prev.filter((c) => c.id !== comment.id)
      );
    }, 3000);

    setReelComment("");
    setShowReelCommentBox(false);
  };

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return "0:00";

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (selectedMovie && activeCategory === "SHORT") {
    return (
      <div
        className="shorts-only-page"
        onWheel={handleReelWheel}
        onTouchStart={handleShortTouchStart}
        onTouchEnd={handleShortTouchEnd}
      >
        <div ref={videoContainerRef} className="shorts-only-frame">
          <div ref={youtubeBoxRef} className="youtube-player-box" />

          <div
            className="video-touch-layer"
            onClick={handleVideoTap}
            onTouchStart={handleHoldStart}
            onTouchEnd={handleHoldEnd}
            onMouseDown={handleHoldStart}
            onMouseUp={handleHoldEnd}
          />

          <button className="shorts-only-back" onClick={goBack}>
            ←
          </button>

          <div className="shorts-only-room">{roomCode}</div>
          <div className="reel-actions">
            {/* <button
              className={`reel-like-btn ${reelLiked ? "liked" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                sendReelLike();
              }}
            >
              <span>{reelLiked ? "💜" : "♡"}</span>
            </button> */}

            <button
              className="reel-comment-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowReelCommentBox(true);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="38"
                height="38"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
            </button>
          </div>

          {/* {showHeart && <div className="big-like-heart">💜</div>} */}

          <div className="floating-comments">
            {floatingComments.map((c) => (
              <div key={c.id} className="floating-comment">
                <strong>{c.user}</strong>: {c.text}
              </div>
            ))}
          </div>

          {showReelCommentBox && (
            <div className="reel-comment-box">
              <input
                value={reelComment}
                onChange={(e) => setReelComment(e.target.value)}
                placeholder="Comment..."
              />
              <button onClick={sendReelComment}>Send</button>
            </div>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="page room-shell-clean">
      <div className="room-clean-header">

        {!selectedMovie && (
          <div className="room-header-row1">
            <div className="room-left-group">
              <div className="room-id-pill room-id-with-actions">
                <span>{roomCode}</span>

                <button
                  className="room-code-icon-btn"
                  onClick={copyRoomCode}
                  title="Copy Room ID"
                >
                  <FiCopy />
                </button>

                <button
                  className="room-code-icon-btn"
                  onClick={shareRoomLink}
                  title="Share Room"
                >
                  <FiShare2 />
                </button>
              </div>

              <button className="room-users-btn" onClick={() => setShowUsers(true)}>
                👥 {roomUsers.length}
              </button>
            </div>

            <div className="room-category-dropdown">
              <button
                className="room-category-select"
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              >
                {activeCategory === "MOVIE"
                  ? "🎬 Movies"
                  : activeCategory === "MUSIC"
                    ? "🎵 Music"
                    : "⚡ Shorts"}
              </button>

              {showCategoryMenu && (
                <div className="room-category-menu">
                  {activeCategory !== "MOVIE" && (
                    <button
                      onClick={() => {
                        setActiveCategory("MOVIE");
                        setSelectedMovie(null);
                        loadTamilMovies();
                        setShowCategoryMenu(false);
                      }}
                    >
                      🎬 Movies
                    </button>
                  )}

                  {activeCategory !== "MUSIC" && (
                    <button
                      onClick={() => {
                        setActiveCategory("MUSIC");
                        setSelectedMovie(null);
                        loadTamilMusic();
                        setShowCategoryMenu(false);
                      }}
                    >
                      🎵 Music
                    </button>
                  )}

                  {activeCategory !== "SHORT" && (
                    <button
                      onClick={() => {
                        setActiveCategory("SHORT");
                        setSelectedMovie(null);
                        loadTamilReels();
                        setShowCategoryMenu(false);
                      }}
                    >
                      ⚡ Shorts
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="room-header-row2">
          {selectedMovie && (
            <div className="room-id-pill room-id-with-actions">
              <span>{roomCode}</span>

              <div className="room-id-actions">
                <button
                  className="room-code-icon-btn"
                  onClick={copyRoomCode}
                  title="Copy Room ID"
                >
                  <FiCopy />
                </button>

                <button
                  className="room-code-icon-btn"
                  onClick={shareRoomLink}
                  title="Share Room"
                >
                  <FiShare2 />
                </button>
              </div>

            </div>
          )}
          <button className="room-back-btn" onClick={goBack}>
            Back
          </button>

        </div>
        <div className="room-search-wrapper">
          <button
            className="room-search-btn"
            onClick={searchYoutubeInsideRoom}
          >
            🔍
          </button>

          <input
            className="room-mobile-search"
            value={movieSearch}
            onChange={(e) => setMovieSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") searchYoutubeInsideRoom();
            }}
            placeholder={
              activeCategory === "SHORT"
                ? "Search reels..."
                : activeCategory === "MUSIC"
                  ? "Search music..."
                  : "Search movies..."
            }
          />

          <button
            className="room-refresh-btn"
            onClick={
              activeCategory === "SHORT"
                ? loadTamilReels
                : activeCategory === "MUSIC"
                  ? loadTamilMusic
                  : loadTamilMovies
            }
          >
            🔄
          </button>

        </div>

      </div>
      {copyMessage && (
        <div className="room-copy-toast">
          <span>✅</span>
          <p>{copyMessage}</p>
        </div>
      )}

      {roomNotification && (
        <div className="room-join-toast">
          {roomNotification}
        </div>
      )}

      <div className="room-body-clean">
        <div className="room-player-right">
          {!selectedMovie ? (
            <div className="room-grid-area">
              {roomYoutubeLoading ? (
                <div className="empty-room-box">Loading...</div>
              ) : roomYoutubeResults.length > 0 ? (
                <div className="room-content-grid">
                  {roomYoutubeResults.map((video, index) => (
                    <div
                      key={video.videoId}
                      className={
                        activeCategory === "SHORT"
                          ? "room-reel-card"
                          : "room-content-card"
                      }
                      onClick={() => {
                        if (activeCategory === "SHORT") {
                          const watched =
                            JSON.parse(localStorage.getItem("watchedReels")) || [];

                          watched.push(video.videoId);

                          localStorage.setItem(
                            "watchedReels",
                            JSON.stringify([...new Set(watched)])
                          );
                          const shuffledFeed = [...roomYoutubeResults].sort(() => Math.random() - 0.5);

                          setShortsFeed(shuffledFeed);

                          const selectedIndex = shuffledFeed.findIndex(
                            (item) => item.videoId === video.videoId
                          );

                          setShortIndex(selectedIndex >= 0 ? selectedIndex : 0);
                          selectYoutubeVideo(video, true, "SHORT");
                          return;
                        }

                        selectYoutubeVideo(video, false, activeCategory);
                      }}
                    >
                      <img src={video.thumbnail} alt={video.title} />
                      <div className="room-card-title">{video.title}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-room-box">
                  <h2>Room created successfully</h2>
                  <p>Select Movies, Music, or Shorts to start watching.</p>
                </div>
              )}
            </div>
          ) : activeCategory === "MUSIC" ? (

            <div className="music-room-layout">

              {/* <div className="music-search-box">
                <span>🔍</span>

                <input
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  placeholder="Search Tamil music..."
                />

                <button onClick={searchYoutubeInsideRoom}>
                  Search
                </button>
              </div> */}
              <div className="music-player-card">
                <div className="music-video-frame">
                  <div ref={youtubeBoxRef} className="youtube-player-box" />

                  <div
                    className="video-touch-layer"
                    onClick={handleVideoTap}
                    onTouchStart={handleHoldStart}
                    onTouchEnd={handleHoldEnd}
                    onMouseDown={handleHoldStart}
                    onMouseUp={handleHoldEnd}
                  />

                  <div className={`music-overlay-progress ${showDuration ? "show-video-ui" : ""}`}>
                    <div className="music-progress" onClick={seekByProgress}>
                      <div
                        className="music-progress-fill"
                        style={{
                          width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                        }}
                      />
                    </div>

                    <div className="music-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className={`music-overlay-controls ${showDuration ? "show-video-ui" : ""}`}>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        backward10();
                      }}
                    >
                      ⏪
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                    >
                      {playing ? "⏸" : "▶"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        forward10();
                      }}
                    >
                      ⏩
                    </button>

                    {/* <button
    onClick={(e) => {
      e.stopPropagation();
      toggleFullscreen();
    }}
  >
    ⛶
  </button> */}

                  </div>
                </div>
              </div>

              {/* <h3>Suggested Songs</h3> */}

              <div className="suggested-music-grid">
                {roomYoutubeResults.map((video) => (
                  <div
                    key={video.videoId}
                    className="suggested-song-card"
                    onClick={() =>
                      selectYoutubeVideo(
                        video,
                        true,
                        "MUSIC"
                      )
                    }
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                    />

                    <p>{video.title}</p>
                  </div>
                ))}
              </div>

            </div>
          ) : (
            <div
              className={
                activeCategory === "SHORT"
                  ? "short-watch-page"
                  : "normal-watch-page"
              }
              onWheel={activeCategory === "SHORT" ? handleReelWheel : undefined}
              onTouchStart={activeCategory === "SHORT" ? handleShortTouchStart : undefined}
              onTouchEnd={activeCategory === "SHORT" ? handleShortTouchEnd : undefined}
            >


              {/* {activeCategory !== "SHORT" && (
                <h2 className="watch-title">
                  {selectedMovie.groupTitle}
                </h2>
              )} */}

              <div
                ref={videoContainerRef}
                className={
                  activeCategory === "SHORT"
                    ? "short-player-frame"
                    : "movie-player-frame"
                }
              >
                <div className="youtube-player-box" ref={youtubeBoxRef}></div>
                <div
                  className={`video-touch-layer ${showDuration ? "controls-open" : ""}`}
                  onClick={handleVideoTap}
                  onTouchStart={handleHoldStart}
                  onTouchEnd={handleHoldEnd}
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                />
                {/* <div className="video-full-progress" onClick={seekByProgress}>
                  <div
                    className="video-full-progress-fill"
                    style={{
                      width:
                        duration > 0
                          ? `${(currentTime / duration) * 100}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="video-full-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div> */}

                {activeCategory !== "SHORT" && (
                  <div className={`video-overlay-progress ${showDuration ? "show-video-ui" : ""}`}>
                    <div className="video-full-progress" onClick={seekByProgress}>
                      <div
                        className="video-full-progress-fill"
                        style={{
                          width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                        }}
                      />
                    </div>

                    <div className="video-full-time">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                )}

                {activeCategory !== "SHORT" && (
                  <div className={`video-controls video-overlay-controls ${showDuration ? "show-video-ui" : ""}`}>
                    <button onClick={backward10}>⏪</button>

                    <button onClick={togglePlay}>
                      {playing ? "⏸" : "▶"}
                    </button>

                    <button onClick={forward10}>⏩</button>

                    <button onClick={toggleFullscreen}>
                      ⛶
                    </button>
                  </div>
                )}
                {activeCategory === "SHORT" && (
                  <>
                    <div className="shorts-header">
                      <button
                        className="shorts-back-btn"
                        onClick={goBack}
                      >
                        ←
                      </button>

                      <div className="shorts-room-pill">
                        {roomCode}
                      </div>
                    </div>

                    <div className="reel-actions">
                      {/* <button
                        className="reel-like-btn"
                        onClick={sendReelLike}
                      >
                        ❤️
                      </button> */}

                      <button
                        className="reel-comment-btn"
                        onClick={() =>
                          setShowReelCommentBox((v) => !v)
                        }
                      >
                        💬
                      </button>
                    </div>

                    {/* {showHeart && (
                        <div className="big-like-heart">
                          💜
                        </div>
                      )} */}

                    <div className="floating-comments">
                      {floatingComments.map((c) => (
                        <div key={c.id} className="floating-comment">
                          <strong>{c.user}</strong>: {c.text}
                        </div>
                      ))}
                    </div>

                    {showReelCommentBox && (
                      <div className="reel-comment-box">
                        <input
                          value={reelComment}
                          onChange={(e) =>
                            setReelComment(e.target.value)
                          }
                          placeholder="Comment..."
                        />

                        <button onClick={sendReelComment}>
                          Send
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        {selectedMovie &&
          (activeCategory === "MOVIE" || activeCategory === "MUSIC") && (
            <div className="room-chat-right">
              <ChatBox
                messages={messages}
                onSend={sendChat}
                currentUser={userName}
                replyTo={replyTo}
                onReply={setReplyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            </div>
          )}

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
    </div>
  );
}