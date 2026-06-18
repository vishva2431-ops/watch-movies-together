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

  const chatStorageKey = `chat_${roomCode}`;

  const userName = localStorage.getItem("userName") || "Guest";

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

  // useEffect(() => {
  //   const handleWheel = (e) => {
  //     if (activeCategory !== "SHORT") return;
  //     if (!selectedMovie) return;

  //     const now = Date.now();

  //     // lock scroll for 1.5 seconds
  //     if (now - lastShortScrollRef.current < 1500) return;
  //     lastShortScrollRef.current = now;

  //     if (e.deltaY > 0) {
  //       nextShort();
  //     } else {
  //       previousShort();
  //     }
  //   };

  //   window.addEventListener("wheel", handleWheel, { passive: true });

  //   return () => {
  //     window.removeEventListener("wheel", handleWheel);
  //   };
  // }, [activeCategory, selectedMovie, shortIndex, shortsFeed, roomYoutubeResults]);

  // useEffect(() => {
  //   const handleWheel = (e) => {
  //     if (activeCategory !== "SHORT") return;
  //     if (!selectedMovie) return;

  //     e.preventDefault();

  //     if (Math.abs(e.deltaY) < 20) return;

  //     const now = Date.now();
  //     if (now - lastShortScrollRef.current < 700) return;

  //     lastShortScrollRef.current = now;

  //     if (e.deltaY > 0) {
  //       nextShort();
  //     } else {
  //       previousShort();
  //     }
  //   };

  //   window.addEventListener("wheel", handleWheel, { passive: false });

  //   return () => {
  //     window.removeEventListener("wheel", handleWheel);
  //   };
  // }, [activeCategory, selectedMovie, shortIndex, shortsFeed, roomYoutubeResults]);

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
        }, 500);
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

  const sendUserJoin = () => {
    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_JOIN",
        userName,
      })
    );
  };

  const sendUserLeave = () => {
    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_LEAVE",
        userName,
      })
    );
  };

  const requestUsers = () => {
    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "USER_REQUEST",
        userName,
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

        if (data.action === "USER_JOIN") {
          addRoomUser(data.userName);
          return;
        }

        if (data.action === "USER_LEAVE") {
          removeRoomUser(data.userName);
          return;
        }

        if (data.action === "USER_REQUEST") {
          sendUserJoin();
          return;
        }

        if (data.action === "SELECT") {
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

            sessionStorage.setItem(
              `selected_${roomCode}`,
              JSON.stringify(youtubeMovie)
            );

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

        if (data.action === "PLAY") playerRef.current.playVideo();
        if (data.action === "PAUSE") playerRef.current.pauseVideo();
        if (data.action === "SEEK") {
          playerRef.current.seekTo(data.currentTime, true);
          setCurrentTime(data.currentTime);
        } if (data.action === "SPEED") playerRef.current.setPlaybackRate(data.playbackRate || 1);

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
    }, 3500);
  };

  const handleVideoTap = (e) => {
    if (isHoldingRef.current) return;

    showDurationTemporarily();

    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || e.changedTouches?.[0]?.clientX || 0;
    const x = clientX - rect.left;
    clearTimeout(singleTapTimerRef.current);

    const isDoubleTap = now - lastTapRef.current < 300;

    if (isDoubleTap) {
      clearTimeout(singleTapTimerRef.current);

      if (x < rect.width * 0.35) {
        backward10();
        // showIcon("⏪");
      } else if (x > rect.width * 0.65) {
        forward10();
        // showIcon("⏩");
      } else {
        pauseVideo();
        // showIcon("⏸");
      }

      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
    clearTimeout(singleTapTimerRef.current);

    singleTapTimerRef.current = setTimeout(() => {
      if (lastTapRef.current === 0) return;

      playVideo();
      // showIcon("▶");

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
    const frame = videoContainerRef.current;
    if (!frame) return;

    if (!document.fullscreenElement) {
      await frame.requestFullscreen();
      frame.classList.add("force-fullscreen-fit");
      setIsFullscreen(true);
    } else {
      frame.classList.remove("force-fullscreen-fit");
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
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
  // const playShortAtIndex = async (index) => {
  //   if (shortsFeed.length === 0) return;

  //   const safeIndex =
  //     index < 0 ? shortsFeed.length - 1 : index >= shortsFeed.length ? 0 : index;

  //   const shortMovie = shortsFeed[safeIndex];

  //   setShortIndex(safeIndex);
  //   await selectMovie(shortMovie);
  // };

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
    const feed = shortsFeed.length > 0
      ? shortsFeed
      : roomYoutubeResults;

    if (feed.length === 0) return;

    const nextIndex =
      shortIndex + 1 >= feed.length
        ? 0
        : shortIndex + 1;

    setShortIndex(nextIndex);

    selectYoutubeVideo(
      feed[nextIndex],
      true,
      "SHORT"
    );

    // syncSelectedShort(feed[nextIndex]);

    // playerRef.current?.loadVideoById?.(
    //   feed[nextIndex].videoId
    // );

    // setTimeout(() => {
    //   playerRef.current?.playVideo?.();
    // }, 500);

    // setTimeout(() => {
    //   playerRef.current?.playVideo?.();
    // }, 800);
  };

  const previousShort = () => {
    const feed = shortsFeed.length > 0
      ? shortsFeed
      : roomYoutubeResults;

    if (feed.length === 0) return;

    const prevIndex =
      shortIndex - 1 < 0
        ? feed.length - 1
        : shortIndex - 1;

    setShortIndex(prevIndex);

    selectYoutubeVideo(
      feed[prevIndex],
      true,
      "SHORT"
    );
    // syncSelectedShort(feed[prevIndex]);

    // playerRef.current?.loadVideoById?.(
    //   feed[prevIndex].videoId
    // );

    // setTimeout(() => {
    //   playerRef.current?.playVideo?.();
    // }, 500);

    // setTimeout(() => {
    //   playerRef.current?.playVideo?.();
    // }, 800);
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

  // const loadTamilReels = async () => {
  //   try {
  //     setRoomYoutubeLoading(true);

  //     const res = await API.get("/youtube/search", {
  //       params: {
  //         q: "tamil funny reels tamil love shorts tamil comedy shorts",
  //         category: "SHORT",
  //       },
  //     });

  //     // console.log("REELS", res.data);

  //     setRoomYoutubeResults(res.data);
  //     setShortsFeed(res.data);
  //     setShortIndex(0);
  //     setSelectedMovie(null);
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setRoomYoutubeLoading(false);
  //   }
  // };

  // const selectYoutubeVideo = async (video) => {
  //   const youtubeMovie = {
  //     id: video.videoId,
  //     videoUrl: video.videoId,
  //     groupTitle: video.title,
  //     partTitle: "SHORT",
  //     youtube: true,
  //   };

  //   setSelectedMovie(youtubeMovie);
  //   setActiveCategory("SHORT");

  //   await API.put(`/rooms/${roomCode}/movie`, {
  //     youtubeVideoId: video.videoId,
  //     youtubeTitle: video.title,
  //     youtubeThumbnail: video.thumbnail,
  //     category: "SHORT",
  //   });

  //   stompClientRef.current?.send(
  //     "/app/room.sync",
  //     {},
  //     JSON.stringify({
  //       roomCode,
  //       action: "SELECT",
  //       youtubeVideoId: video.videoId,
  //       youtubeTitle: video.title,
  //       youtubeThumbnail: video.thumbnail,
  //       category: "SHORT",
  //       currentTime: 0,
  //     })
  //   );
  // };

  // const nextTamilReel = () => {
  //   if (roomYoutubeResults.length === 0) return;

  //   const nextIndex = shortIndex + 1 >= roomYoutubeResults.length ? 0 : shortIndex + 1;
  //   setShortIndex(nextIndex);
  //   selectYoutubeVideo(roomYoutubeResults[nextIndex]);
  // };

  // const previousTamilReel = () => {
  //   if (roomYoutubeResults.length === 0) return;

  //   const prevIndex = shortIndex - 1 < 0 ? roomYoutubeResults.length - 1 : shortIndex - 1;
  //   setShortIndex(prevIndex);
  //   selectYoutubeVideo(roomYoutubeResults[prevIndex]);
  // };

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

    sessionStorage.setItem(
      `selected_${roomCode}`,
      JSON.stringify(youtubeMovie)
    );

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
  // const nextShort = () => {
  //   if (shortsFeed.length === 0) return;

  //   const nextIndex =
  //     currentShortIndex === shortsFeed.length - 1
  //       ? 0
  //       : currentShortIndex + 1;

  //   setCurrentShortIndex(nextIndex);

  //   selectYoutubeVideo(shortsFeed[nextIndex]);
  // };
  // const previousShort = () => {
  //   if (shortsFeed.length === 0) return;

  //   const prevIndex =
  //     currentShortIndex === 0
  //       ? shortsFeed.length - 1
  //       : currentShortIndex - 1;

  //   setCurrentShortIndex(prevIndex);

  //   selectYoutubeVideo(shortsFeed[prevIndex]);
  // };
  //   const handleShortWheel = (e) => {
  //   console.log("Wheel detected");

  //   if (e.deltaY > 0) {
  //     nextShort();
  //   } else {
  //     previousShort();
  //   }
  // };

  // const loadTamilMusic = async () => {
  //   try {
  //     setRoomYoutubeLoading(true);

  //     const queries = [
  //       // "tamil old hit songs",
  //       "tamil new songs",
  //       // "tamil melody songs",
  //       "tamil latest love songs",
  //       // "ilaiyaraaja tamil songs",
  //       // "ar rahman tamil songs",
  //     ];

  //     const randomQuery = queries[Math.floor(Math.random() * queries.length)];

  //     const res = await API.get("/youtube/search", {
  //       params: {
  //         q: randomQuery,
  //         category: "MUSIC",
  //       },
  //     });

  //     // console.log("MUSIC", res.data);

  //     setRoomYoutubeResults(res.data);
  //     setMovieSearch("");
  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setRoomYoutubeLoading(false);
  //   }
  // };;

  // const [currentShortIndex, setCurrentShortIndex] =
  // useState(
  //   Number(
  //     sessionStorage.getItem(
  //       `shortIndex_${roomCode}`
  //     )
  //   ) || 0
  // );
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
          q: "latest tamil songs new tamil music 2025 melody kuthu love songs",
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
        "tamil love reels comedy friendship shorts",
        "tamil funny reels trending shorts",
        "tamil friendship reels college comedy shorts",
        // "tamil gym motivation reels shorts",
        "tamil cooking reels food shorts",
        "tamil couple love reels funny shorts"
      ];

      const randomQuery = queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get("/youtube/search", {
        params: {
          q: randomQuery,
          category: "SHORT",
        },
      });

      const shuffled = [...res.data].sort(() => Math.random() - 0.5);

      setRoomYoutubeResults(shuffled);
      setShortsFeed(shuffled);
      setShortIndex(0);
      setSelectedMovie(null);
      setMovieSearch("");
    } catch (err) {
      console.error(err);
      alert("Unable to load reels");
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
        title: "Join my Watch Party",
        text: `Join my Watch Party room: ${roomCode}`,
        url: roomLink,
      });
    } else {
      await navigator.clipboard.writeText(roomLink);
      alert("Share is not supported. Room link copied instead.");
    }
  };

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
          <button className="room-back-btn" onClick={goBack}>
            Back
          </button>
          {/* {selectedMovie && (
            <button className="room-back-btn" onClick={goBack}>
              Back
            </button>
          )} */}
        </div>

      </div>
      {copyMessage && (
        <div className="room-copy-toast">
          <span>✅</span>
          <p>{copyMessage}</p>
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
                        setShortIndex(index);
                        selectYoutubeVideo(video, activeCategory === "SHORT", activeCategory);
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
                </div>
                {/* 
  <div className="music-controls">
    <button onClick={backward10}>⏪</button>

    <button onClick={togglePlay}>
      {playing ? "⏸" : "▶"}
    </button>

    <button onClick={forward10}>⏩</button>
  </div> */}

                <div className="music-progress" onClick={seekByProgress}>
                  <div
                    className="music-progress-fill"
                    style={{
                      width:
                        duration > 0
                          ? `${(currentTime / duration) * 100}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="music-time">
                  {formatTime(currentTime)} / {formatTime(duration)}
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
                  className="video-touch-layer"
                  onClick={handleVideoTap}
                  onTouchStart={handleHoldStart}
                  onTouchEnd={handleHoldEnd}
                  onMouseDown={handleHoldStart}
                  onMouseUp={handleHoldEnd}
                />

                {activeCategory !== "SHORT" && (
                  <div className="video-controls">
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