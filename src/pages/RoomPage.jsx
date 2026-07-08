import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import SockJS from "sockjs-client/dist/sockjs";
import Stomp from "stompjs";
import { API, API_BASE_URL, extractYouTubeId } from "../api";
import {
  buildBaseSyncPayload,
  buildCategorySyncPayload,
  buildSelectMoviePayload,
  buildSelectYoutubePayload,
  buildSyncResponsePayload,
  createRoomClientId,
  isOwnRoomSyncMessage,
  sendRoomSync,
} from "../sync/RoomSync";
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
  const location = useLocation();

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
  const roomUsersRef = useRef([]);
  // IMPORTANT: keep this ID unique per opened tab/window.
  // Do not store it in sessionStorage because duplicated tabs can copy the same value
  // and then one browser will ignore the other browser's sync as its own message.
  const roomClientIdRef = useRef(createRoomClientId());
  const suppressPlayerStateSyncRef = useRef(false);
  const lastRemoteSeekAtRef = useRef(0);
  const roomUserMapRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const isUnmountingRef = useRef(false);


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
  const [roomHostName, setRoomHostName] = useState("");
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
  const [musicSearched, setMusicSearched] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [nextSuggestion, setNextSuggestion] = useState(null);
  const suggestionTimerRef = useRef(null);

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
      isUnmountingRef.current = true;
      clearTimeout(reconnectTimerRef.current);
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
    sessionStorage.removeItem("shortsFeed");
    sessionStorage.removeItem("shortsStartVideoId");
  }, []);

  useEffect(() => {
    selectedMovieRef.current = selectedMovie;
  }, [selectedMovie]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    const handleOnline = () => {
      if (!stompClientRef.current?.connected && !isUnmountingRef.current) {
        console.log("Internet restored. Reconnecting socket...");
        connectSocket();
      }
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (activeCategory !== "SHORT") return;

    const feed = shortsFeed.length > 0 ? shortsFeed : roomYoutubeResults;
    preloadShortThumbnails(feed, shortIndex);
  }, [shortIndex, shortsFeed, roomYoutubeResults, activeCategory]);


  const resetRoomListsForCategory = (category) => {
    setRoomYoutubeResults([]);
    setShortsFeed([]);
    setSearchSuggestions([]);
    setNextSuggestion(null);
    setMovieSearch("");
    setMusicSearched(false);
    setShortIndex(0);
    playedReelsRef.current = [];
    reelBackHistoryRef.current = [];
    reelForwardHistoryRef.current = [];
  };

  const loadCategorySuggestions = (category) => {
    setTimeout(() => {
      if (category === "MOVIE") loadTamilMovies();
      if (category === "MUSIC") loadTamilMusic();
      if (category === "SHORT") loadTamilReels();
    }, 0);
  };

  const applyCategoryOnlySync = (category = "MOVIE") => {
    const safeCategory = category || "MOVIE";
    setActiveCategory(safeCategory);
    document.body.classList.add("category-switching");

    setTimeout(() => {
      document.body.classList.remove("category-switching");
    }, 250);
    activeCategoryRef.current = safeCategory;
    setSelectedMovie(null);
    selectedMovieRef.current = null;
    resetRoomListsForCategory(safeCategory);
    sessionStorage.removeItem(`selected_${roomCode}`);

    if (safeCategory === "SHORT") {
      setTimeout(() => {
        loadTamilReels();
      }, 150);
    } else {
      loadCategorySuggestions(safeCategory);
    }
  };

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

    e.preventDefault();

    if (Math.abs(e.deltaY) < 10) return;

    const now = Date.now();
    if (now - lastShortScrollRef.current < 90) return;

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

  useEffect(() => {
    roomUsersRef.current = roomUsers;
  }, [roomUsers]);

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
      setRoomHostName(roomData.hostName || "");
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

        const youtubeMovie = {
          id: roomData.youtubeVideoId,
          videoUrl: roomData.youtubeVideoId,
          groupTitle: roomData.youtubeTitle,
          partTitle: cat,
          youtube: true,
        };
        if (cat === "SHORT") {
          const shouldPlayDirect =
            new URLSearchParams(location.search).get("play") === "true";

          if (shouldPlayDirect) {
            setSelectedMovie(youtubeMovie);
            setNextSuggestion(null);

            window.history.replaceState(
              null,
              "",
              `/room/${roomCode}`
            );
          } else {
            setSelectedMovie(null);
            loadTamilReels();
          }

          sessionStorage.removeItem(`selected_${roomCode}`);
        }
        else {
          setSelectedMovie(youtubeMovie);

          sessionStorage.setItem(
            `selected_${roomCode}`,
            JSON.stringify(youtubeMovie)
          );
        }

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

  const forcePlayShort = () => {
    if (activeCategoryRef.current !== "SHORT") return;

    suppressPlayerStateSyncRef.current = true;

    setTimeout(() => {
      playerRef.current?.seekTo?.(0, true);
      playerRef.current?.unMute?.();
      playerRef.current?.setVolume?.(100);
      playerRef.current?.setPlaybackRate?.(1);
      playerRef.current?.playVideo?.();
      setPlaying(true);

      setTimeout(() => {
        suppressPlayerStateSyncRef.current = false;
      }, 800);
    }, 450);
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
        const savedState = lastRoomStateRef.current;
        playerRef.current.loadVideoById(videoId);
        setTimeout(() => {
          playerRef.current?.seekTo?.(savedState.currentTime || 0, true);
          playerRef.current?.setPlaybackRate?.(savedState.playbackRate || 1);
          if (activeCategoryRef.current === "SHORT") {
            forcePlayShort();
          } else if (savedState.action === "PAUSE") {
            playerRef.current?.pauseVideo?.();
          } else {
            playerRef.current?.playVideo?.();
          }
          setDuration(playerRef.current?.getDuration?.() || 0);
        }, 250);
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

            if (activeCategoryRef.current === "SHORT") {
              forcePlayShort();
            }

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

              // Sync real player state changes too, not only overlay button clicks.
              // ignoreEventRef prevents rebroadcast loops when this change came from another device.
              if (!ignoreEventRef.current && !suppressPlayerStateSyncRef.current) {
                sendSync("PLAY", {
                  currentTime: playerRef.current?.getCurrentTime?.() || 0,
                });
              }
            }

            if (event.data === window.YT.PlayerState.PAUSED) {
              setPlaying(false);

              if (!ignoreEventRef.current && !suppressPlayerStateSyncRef.current) {
                sendSync("PAUSE", {
                  currentTime: playerRef.current?.getCurrentTime?.() || 0,
                });
              }
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              setPlaying(false);

              if (
                activeCategoryRef.current === "MOVIE" ||
                activeCategoryRef.current === "MUSIC"
              ) {
                showNextSuggestionCard();
              }
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

  // const handleReelTap = (e) => {
  //   if (activeCategoryRef.current !== "SHORT") return;
  //   e.stopPropagation();

  //   const state = playerRef.current?.getPlayerState?.();

  //   if (state === window.YT.PlayerState.PLAYING) {
  //     playerRef.current?.pauseVideo?.();
  //     setPlaying(false);
  //   } else {
  //     playerRef.current?.playVideo?.();
  //     setPlaying(true);
  //   }
  // };


  const addRoomUser = (name, clientId = name) => {
    if (!name || !clientId) return;

    roomUserMapRef.current.set(clientId, name);

    const uniqueNames = [...new Set([...roomUserMapRef.current.values()])];
    setRoomUsers(uniqueNames);
  };

  const removeRoomUser = (clientIdOrName) => {
    if (!clientIdOrName) return;

    roomUserMapRef.current.delete(clientIdOrName);

    for (const [id, name] of roomUserMapRef.current.entries()) {
      if (name === clientIdOrName) {
        roomUserMapRef.current.delete(id);
      }
    }

    const uniqueNames = [...new Set([...roomUserMapRef.current.values()])];
    setRoomUsers(uniqueNames);
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
        clientId: roomClientIdRef.current,
      })
    );

    setTimeout(() => requestUsers(), 500);
    setTimeout(() => requestUsers(), 1500);
    setTimeout(() => requestUsers(), 3000);

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "SYNC_REQUEST",
        userName: name,
        clientId: roomClientIdRef.current,

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
        clientId: roomClientIdRef.current,
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
        clientId: roomClientIdRef.current,
      })
    );
  };

  const connectSocket = () => {
    if (stompClientRef.current?.connected) return;

    const socket = new SockJS(`${API_BASE_URL}/ws`);
    const client = Stomp.over(socket);

    client.debug = () => { };

    socket.onclose = () => {
      console.log("Socket disconnected");

      if (isUnmountingRef.current) return;

      clearTimeout(reconnectTimerRef.current);

      reconnectTimerRef.current = setTimeout(() => {
        if (navigator.onLine && !stompClientRef.current?.connected) {
          console.log("Trying to reconnect socket...");
          connectSocket();
        }
      }, 2000);
    };

    client.connect({}, () => {
      stompClientRef.current = client;
      clearTimeout(reconnectTimerRef.current);
      isUnmountingRef.current = false;

      client.subscribe(`/topic/room/${roomCode}`, async (message) => {
        const data = JSON.parse(message.body);

        if (data.action === "REEL_COMMENT") {
          const text = data.text || data.comment;

          if (!text?.trim()) return;

          const comment = {
            id: Date.now(),
            user: data.userName,
            text,
          };

          setFloatingComments((prev) => [...prev, comment]);
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

          console.log("JOIN:", data.userName);

          addRoomUser(data.userName, data.clientId);

          if (data.userName !== getSafeUserName()) {
            showRoomNotification(
              `${data.userName} joined the room`
            );
          }

          return;
        }

        if (data.action === "USER_LEAVE") {

          removeRoomUser(data.clientId || data.userName);

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
          data.userName !== getSafeUserName()
        ) {
          sendUserJoin();
          return;
        }

        // ✅ ADD THIS BEFORE SELECT
        if (data.action === "SYNC_REQUEST") {
          const currentMovie = selectedMovieRef.current;
          const currentCategory = activeCategoryRef.current;

          stompClientRef.current?.send(
            "/app/room.sync",
            {},
            JSON.stringify({
              roomCode,
              action: "SYNC_RESPONSE",
              targetUser: data.userName,
              targetClientId: data.clientId,
              userName: getSafeUserName(),
              clientId: roomClientIdRef.current,
              youtubeVideoId: currentMovie?.youtube ? currentMovie.videoUrl : null,
              youtubeTitle: currentMovie?.groupTitle || "",
              youtubeThumbnail: currentMovie?.youtubeThumbnail || "",
              movieId: currentMovie && !currentMovie.youtube ? currentMovie.id : null,
              category: currentCategory,
              currentTime: playerRef.current?.getCurrentTime?.() || 0,
              playbackRate: playerRef.current?.getPlaybackRate?.() || 1,
              playing:
                playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING ||
                currentCategory === "SHORT",
            })
          );

          return;
        }

        if (data.action === "SYNC_RESPONSE") {
          if (data.targetClientId !== roomClientIdRef.current) return;
          lastRoomStateRef.current = {
            action: data.playing ? "PLAY" : "PAUSE",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };

          if (data.youtubeVideoId) {
            // sessionStorage.setItem(`joined_${roomCode}`, "true");
            const youtubeMovie = {
              id: data.youtubeVideoId,
              videoUrl: data.youtubeVideoId,
              groupTitle: data.youtubeTitle,
              partTitle: data.category,
              youtube: true,
            };

            setActiveCategory(data.category || "MOVIE");
            activeCategoryRef.current = data.category || "MOVIE";
            setSelectedMovie(youtubeMovie);
            selectedMovieRef.current = youtubeMovie;

            if ((data.category || "MOVIE") === "SHORT") {
              setTimeout(() => {
                createOrUpdatePlayer(youtubeMovie);

                setTimeout(() => {
                  playerRef.current?.seekTo?.(data.currentTime || 0, true);
                  playerRef.current?.unMute?.();
                  playerRef.current?.setVolume?.(100);
                  if (data.playing !== false) playerRef.current?.playVideo?.();
                }, 700);
              }, 300);
            }

            if ((data.category || "MOVIE") !== "SHORT") {
              sessionStorage.setItem(
                `selected_${roomCode}`,
                JSON.stringify(youtubeMovie)
              );
            } else {
              sessionStorage.removeItem(`selected_${roomCode}`);
            }
          } else if (data.category) {
            applyCategoryOnlySync(data.category);
          }

          return;
        }

        if (data.action === "SELECT") {
          if (isOwnRoomSyncMessage(data, roomClientIdRef.current)) return;
          if (
            activeCategoryRef.current === "SHORT" &&
            selectedMovieRef.current?.videoUrl === data.youtubeVideoId
          ) {
            return;
          }
          lastRoomStateRef.current = {
            action: "PLAY",
            currentTime: 0,
            playbackRate: 1,
          };

          if (!data.movieId && !data.youtubeVideoId) {
            applyCategoryOnlySync(data.category || "MOVIE");
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
            activeCategoryRef.current = data.category || "MOVIE";
            setSelectedMovie(youtubeMovie);
            selectedMovieRef.current = youtubeMovie;

            lastRoomStateRef.current = {
              action: "PLAY",
              currentTime: data.currentTime || 0,
              playbackRate: data.playbackRate || 1,
            };

            setTimeout(() => {
              createOrUpdatePlayer(youtubeMovie);

              setTimeout(() => {
                playerRef.current?.seekTo?.(data.currentTime || 0, true);
                playerRef.current?.setPlaybackRate?.(data.playbackRate || 1);

                if (data.category === "SHORT") {
                  playerRef.current?.unMute?.();
                  playerRef.current?.setVolume?.(100);
                }

                playerRef.current?.playVideo?.();
              }, 700);
            }, 250);

            if ((data.category || "MOVIE") !== "SHORT") {
              sessionStorage.setItem(
                `selected_${roomCode}`,
                JSON.stringify(youtubeMovie)
              );
            } else {
              sessionStorage.removeItem(`selected_${roomCode}`);
            }

            setMovieSearch("");

            // setTimeout(() => {
            //   if (data.category === "SHORT") {
            //     playerRef.current?.unMute?.();
            //     playerRef.current?.setVolume?.(100);
            //   }

            //   playerRef.current?.playVideo?.();
            // }, 800);

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
            setActiveCategory(data.category || movie.category || "MOVIE");
            setSelectedMovie(movie);
            selectedMovieRef.current = movie;
            setMovieSearch("");

            lastRoomStateRef.current = {
              action: "PLAY",
              currentTime: data.currentTime || 0,
              playbackRate: data.playbackRate || 1,
            };

            setTimeout(() => {
              createOrUpdatePlayer(movie);

              setTimeout(() => {
                playerRef.current?.seekTo?.(data.currentTime || 0, true);
                playerRef.current?.setPlaybackRate?.(data.playbackRate || 1);
                playerRef.current?.playVideo?.();
              }, 700);
            }, 250);
          }

          return;
        }

        if (!playerRef.current) return;

        ignoreEventRef.current = true;

        // if (typeof data.currentTime === "number") {
        //   playerRef.current.seekTo(data.currentTime, true);
        // }

        if (data.playbackRate) {
          playerRef.current.setPlaybackRate(data.playbackRate);
        }

        if (data.action === "PLAY") {
          suppressPlayerStateSyncRef.current = true;
          playerRef.current.playVideo();

          lastRoomStateRef.current = {
            action: "PLAY",
            currentTime: playerRef.current?.getCurrentTime?.() || data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };

          setTimeout(() => {
            suppressPlayerStateSyncRef.current = false;
          }, 900);
        }

        if (data.action === "PAUSE") {
          suppressPlayerStateSyncRef.current = true;
          playerRef.current.pauseVideo();

          lastRoomStateRef.current = {
            action: "PAUSE",
            currentTime: playerRef.current?.getCurrentTime?.() || data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };

          setTimeout(() => {
            suppressPlayerStateSyncRef.current = false;
          }, 900);
        }

        if (data.action === "SEEK") {
          suppressPlayerStateSyncRef.current = true;
          lastRemoteSeekAtRef.current = Date.now();

          playerRef.current.seekTo(data.currentTime, true);
          setCurrentTime(data.currentTime);

          lastRoomStateRef.current = {
            action: "SEEK",
            currentTime: data.currentTime || 0,
            playbackRate: data.playbackRate || 1,
          };

          setTimeout(() => {
            suppressPlayerStateSyncRef.current = false;
          }, 1200);
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

        setMessages((prev) => {
          const exists = prev.some((msg) =>
            data.id
              ? msg.id === data.id
              : msg.sender === data.sender &&
              msg.text === data.text &&
              JSON.stringify(msg.replyTo || null) === JSON.stringify(data.replyTo || null)
          );

          if (exists) return prev;
          return [...prev, data];
        });
      });

      const name = getSafeUserName();

      addRoomUser(name, roomClientIdRef.current);

      client.send(
        "/app/room.sync",
        {},
        JSON.stringify({
          roomCode,
          action: "USER_JOIN",
          userName: name,
          clientId: roomClientIdRef.current,
        })

      );
      console.log("SENDING USER_JOIN", name);
      setTimeout(() => {
        client.send(
          "/app/room.sync",
          {},
          JSON.stringify({
            roomCode,
            action: "SYNC_REQUEST",
            userName: name,
            clientId: roomClientIdRef.current,
          })
        );
      }, 500);
    });

  };

  const selectMovie = async (movie) => {
    setSelectedMovie(movie);
    selectedMovieRef.current = movie;
    setMovieSearch(`${movie.groupTitle} - ${movie.partTitle}`);
    setShowMovieDropdown(false);
    setActiveCategory(movie.category || "MOVIE");
    activeCategoryRef.current = movie.category || "MOVIE";

    await API.put(`/rooms/${roomCode}/movie`, {
      movieId: movie.id,
      category: movie.category || "MOVIE",
    });

    sendRoomSync(
      stompClientRef.current,
      buildSelectMoviePayload({
        roomCode,
        userName: getSafeUserName(),
        clientId: roomClientIdRef.current,
        movie,
        category: movie.category || "MOVIE",
      })
    );
  };

  const getCurrentTime = () => {
    if (!playerRef.current?.getCurrentTime) return 0;
    return playerRef.current.getCurrentTime();
  };

  const sendSync = (action, extra = {}) => {
    if (!stompClientRef.current || !playerRef.current) return;

    const payload = buildBaseSyncPayload({
      roomCode,
      action,
      userName: getSafeUserName(),
      clientId: roomClientIdRef.current,
      currentTime: getCurrentTime(),
      playbackRate: playerRef.current.getPlaybackRate?.() || 1,
      extra,
    });

    lastRoomStateRef.current = payload;
    sendRoomSync(stompClientRef.current, payload);
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
    const total = playerRef.current.getDuration();
    const newTime = Math.min(current + 10, total - 1);

    const wasPlaying =
      playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING;

    suppressPlayerStateSyncRef.current = true;

    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);

    sendSync("SEEK", { currentTime: newTime });

    setTimeout(() => {
      if (wasPlaying) {
        playerRef.current?.playVideo?.();
        sendSync("PLAY");
      }
      suppressPlayerStateSyncRef.current = false;
    }, 700);
  };

  const backward10 = () => {
    if (!isPlayerReady()) return;

    const current = playerRef.current.getCurrentTime();
    const newTime = Math.max(current - 10, 0);

    const wasPlaying =
      playerRef.current.getPlayerState?.() === window.YT.PlayerState.PLAYING;

    suppressPlayerStateSyncRef.current = true;

    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);

    sendSync("SEEK", { currentTime: newTime });

    setTimeout(() => {
      if (wasPlaying) {
        playerRef.current?.playVideo?.();
        sendSync("PLAY");
      }
      suppressPlayerStateSyncRef.current = false;
    }, 700);
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
      if (activeCategoryRef.current === "SHORT") {
        togglePlay();
      } else {
        showDurationTemporarily();
      }

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
        id: `${Date.now()}-${getSafeUserName()}-${Math.random()}`,
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

        await document.exitFullscreen();

        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock("portrait");
          } catch (err) {
            console.log("Portrait lock not supported");
          }
        }

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
    sendRoomSync(
      stompClientRef.current,
      buildSelectYoutubePayload({
        roomCode,
        userName: getSafeUserName(),
        clientId: roomClientIdRef.current,
        video: shortVideo,
        category: "SHORT",
      })
    );
  };

  const saveWatchedReel = (videoId) => {
    if (!videoId) return;

    const watched =
      JSON.parse(localStorage.getItem("visionArcSeenReels")) || [];

    const unique = [...new Set([...watched, videoId])].slice(-200);

    localStorage.setItem("visionArcSeenReels", JSON.stringify(unique));
  };

  const preloadShortThumbnails = (feed, currentIndex) => {
    if (!feed || feed.length === 0) return;

    const nextItems = [
      feed[currentIndex + 1],
      feed[currentIndex + 2],
      feed[currentIndex + 3],
    ].filter(Boolean);

    nextItems.forEach((item) => {
      if (item?.thumbnail) {
        const img = new Image();
        img.src = item.thumbnail;
      }
    });
  };

  const nextShort = () => {
    const feed = shortsFeed.length > 0 ? shortsFeed : roomYoutubeResults;
    if (feed.length === 0) return;

    let nextIndex;

    if (reelForwardHistoryRef.current.length > 0) {
      nextIndex = reelForwardHistoryRef.current.pop();
    } else {
      reelBackHistoryRef.current.push(shortIndex);
      nextIndex = getRandomShortIndex(feed);
    }

    setShortIndex(nextIndex);

    const nextVideo = feed[nextIndex];
    if (!nextVideo) return;

    // setSelectedMovie({
    //   id: nextVideo.videoId,
    //   videoUrl: nextVideo.videoId,
    //   groupTitle: nextVideo.title,
    //   partTitle: "SHORT",
    //   youtube: true,
    // });

    const shortMovie = {
      id: nextVideo.videoId,
      videoUrl: nextVideo.videoId,
      groupTitle: nextVideo.title,
      partTitle: "SHORT",
      youtube: true,
    };

    setSelectedMovie(shortMovie);
    selectedMovieRef.current = shortMovie;
    syncSelectedShort(nextVideo);

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

    // setSelectedMovie({
    //   id: prevVideo.videoId,
    //   videoUrl: prevVideo.videoId,
    //   groupTitle: prevVideo.title,
    //   partTitle: "SHORT",
    //   youtube: true,
    // });

    const shortMovie = {
      id: prevVideo.videoId,
      videoUrl: prevVideo.videoId,
      groupTitle: prevVideo.title,
      partTitle: "SHORT",
      youtube: true,
    };

    setSelectedMovie(shortMovie);
    selectedMovieRef.current = shortMovie;
    syncSelectedShort(prevVideo);

  };

  const handleShortTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleShortTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - endY;

    if (Math.abs(diff) < 70) return;

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
    if (!feed || feed.length === 0) return 0;

    const watched =
      JSON.parse(localStorage.getItem("visionArcSeenReels")) || [];

    const watchedSet = new Set(watched);
    const currentId = selectedMovieRef.current?.videoUrl;

    let available = feed
      .map((video, index) => ({ video, index }))
      .filter(({ video }) => video?.videoId)
      .filter(({ video }) => video.videoId !== currentId)
      .filter(({ video }) => !playedReelsRef.current.includes(video.videoId))
      .filter(({ video }) => !watchedSet.has(video.videoId));

    if (available.length === 0) {
      playedReelsRef.current = [];

      available = feed
        .map((video, index) => ({ video, index }))
        .filter(({ video }) => video?.videoId)
        .filter(({ video }) => video.videoId !== currentId);
    }

    if (available.length === 0) return 0;

    const selected = available[Math.floor(Math.random() * available.length)];

    playedReelsRef.current.push(selected.video.videoId);
    saveWatchedReel(selected.video.videoId);

    return selected.index;
  };

  const handleSearchTyping = (value) => {
    setMovieSearch(value);
    clearTimeout(suggestionTimerRef.current);

    const q = value.trim();

    if (q.length < 3) {
      setRoomYoutubeResults([]);
      setSearchSuggestions([]);
      return;
    }

    suggestionTimerRef.current = setTimeout(() => {
      searchYoutubeInsideRoom(q);
    }, 400);
  };

  const searchYoutubeInsideRoom = async (customQuery = "") => {
    const finalQuery = customQuery.trim() || movieSearch.trim();
    const category = activeCategoryRef.current;

    if (!finalQuery) return;

    try {
      setRoomYoutubeLoading(true);
      setSelectedMovie(null);
      sessionStorage.removeItem(`selected_${roomCode}`);

      setRoomYoutubeResults([]);
      setShortsFeed([]);
      setSearchSuggestions([]);

      const res = await API.get(
        category === "SHORT" ? "/youtube/shorts-feed" : "/youtube/search",
        {
          params: {
            q: category === "SHORT" ? `${finalQuery} tamil shorts reels` : finalQuery,
            category,
            fresh: Date.now(),
          },
        }
      );

      let results = res.data || [];

      if (category === "MOVIE") {
        results = results.filter((item) => {
          const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
          return !text.includes("shorts") &&
            !text.includes("reels") &&
            !text.includes("shortvideo") &&
            !text.includes("shortsfeed") &&
            !text.includes("whatsappstatus") &&
            !text.includes("status");
        });
      }

      setRoomYoutubeResults(results);

      if (category === "SHORT") {
        setShortsFeed(results);
        setShortIndex(0);
      }

      if (category === "MUSIC") {
        setMusicSearched(true);
      }

      setMovieSearch(finalQuery);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const selectYoutubeVideo = async (
    video,
    keepFeed = false,
    forcedCategory = activeCategory
  ) => {
    if (
      forcedCategory === "SHORT" &&
      selectedMovieRef.current?.videoUrl === video.videoId
    ) {
      return;
    }
    const youtubeMovie = {
      id: video.videoId,
      videoUrl: video.videoId,
      groupTitle: video.title,
      partTitle: forcedCategory,
      youtube: true,
    };

    setSelectedMovie(youtubeMovie);
    selectedMovieRef.current = youtubeMovie;
    setNextSuggestion(null);

    if (forcedCategory !== "SHORT") {
      sessionStorage.setItem(
        `selected_${roomCode}`,
        JSON.stringify(youtubeMovie)
      );
    } else {
      sessionStorage.removeItem(`selected_${roomCode}`);
    }

    setActiveCategory(forcedCategory);
    activeCategoryRef.current = forcedCategory;
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

    sendRoomSync(
      stompClientRef.current,
      buildSelectYoutubePayload({
        roomCode,
        userName: getSafeUserName(),
        clientId: roomClientIdRef.current,
        video,
        category: forcedCategory,
      })
    );
  };

  const switchRoomCategory = async (category) => {
    applyCategoryOnlySync(category);

    try {
      await API.put(`/rooms/${roomCode}/movie`, { category });
    } catch (err) {
      console.error("Unable to save room category", err);
    }

    sendRoomSync(
      stompClientRef.current,
      buildCategorySyncPayload({
        roomCode,
        userName: getSafeUserName(),
        clientId: roomClientIdRef.current,
        category,
      })
    );
  };

  const loadTamilMovies = async (fresh = false) => {
    try {
      setRoomYoutubeLoading(true);

      const queries = [
        "latest tamil full movie",
        "latest hollywood full movie",
        "latest tamil dubbed movie",
        "latest hollywood dubbed movie",
        "latest tamil web series",
        "latest hollywood web series",
        "latest tamil vlog",
        "latest travel vlog tamil",
        "latest food vlog tamil",
        "vj siddhu vlog",
        "irfan view latest vlog",
        "parithabangal latest",
        "latest comedy show tamil"
      ];

      const randomQuery = queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get(fresh ? "/youtube/search" : "/youtube/cached-discover", {
        params: {
          q: randomQuery,
          category: "MOVIE",
          fresh: fresh ? Date.now() : undefined,
        },
      });

      setRoomYoutubeResults(res.data);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const loadTamilMusic = async (fresh = false) => {
    try {
      setRoomYoutubeLoading(true);

      const queries = [
        "latest tamil songs official music video",
        "new tamil songs official music video",
        "trending tamil songs official music video",
        "latest tamil melody songs official music video",
        "latest tamil romantic songs official music video",
        "latest english songs official music video",
        "new english songs official music video",
        "trending english songs official music video",
      ];

      const randomQuery = queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get(fresh ? "/youtube/search" : "/youtube/cached-discover", {
        params: {
          q: randomQuery,
          category: "MUSIC",
          fresh: fresh ? Date.now() : undefined,
        },
      });

      setMusicSearched(false);
      setRoomYoutubeResults(res.data);
    } finally {
      setRoomYoutubeLoading(false);
    }
  };

  const loadTamilReels = async () => {
    try {
      setRoomYoutubeLoading(true);

      const queries = [
        "Manikandan YT shorts",
        "Manikandan YT tamil reels",
        "Manikandan YT latest shorts",

        "Kaathadi Club shorts",
        "Kaathadi Club tamil reels",
        "Kaathadi Club comedy shorts",

        "Shiva Entertainer shorts",
        "Shiva Entertainer tamil reels",
        "Shiva Entertainer comedy shorts",

        "The Content Hub shorts",
        "The Content Hub tamil reels",
        "The Content Hub latest shorts",

        "Mallesh Kannan shorts",
        "Mallesh Kannan tamil reels",

        "VJ Siddhu shorts",
        "VJ Siddhu latest reels",
        "VJ Siddhu comedy shorts",

        "mabu crush shorts",
        "ismail shorts tamil",
        "manikandan yt shorts",
        "kaathadi club shorts",
        "shiva entertainer shorts",
        "the content hub shorts",
        "mallesh kannan shorts",
        "vijay tv shorts tamil",
        "tamil content creators shorts",

        "Eruma Saani shorts",
        "Black Sheep Tamil shorts",
        "Parithabangal latest shorts",
        "Gopi Sudhakar shorts",

        "latest tamil love reels shorts",
        "latest tamil couple reels shorts",
        "latest tamil friendship reels shorts",
        "latest tamil comedy reels shorts",
        "new viral love reels shorts tamil",

        "english love reels shorts",
        "couple goals shorts tamil",
        "tamil romantic couple shorts",

        "tamil movie love shorts",
        "tamil movie romantic shorts",
        "tamil movie comedy shorts",
        "tamil movie friendship shorts",
        "kollywood love shorts",
        "kollywood comedy shorts",
        "kollywood romantic shorts",
        "tamil love scene shorts",
        "tamil comedy scene shorts",
        "tamil romantic scene shorts"
      ];


      const allowedWords = [
        "tamil movie love shorts",
        "tamil movie comedy shorts",
        "tamil movie friendship shorts",
        "tamil movie romantic shorts",
        "tamil movie scene shorts",

        "kollywood love shorts",
        "kollywood comedy shorts",
        "kollywood romantic shorts",
        "kollywood friendship shorts",

        "tamil love scene",
        "tamil comedy scene",
        "tamil romantic scene",
        "tamil friendship scene",

        "tamil", "kollywood",

        // Tamil identity
        "tamil",
        "tamizh",
        "kollywood",

        // Tamil creators
        "manikandan yt",
        "manikandan",

        "kaathadi club",

        "shiva entertainer",

        "the content hub",

        "mallesh kannan",
        "mallesh",

        "mabu crush",

        "ismail",

        "vj siddhu shorts",
        "vj siddhu reels",

        "eruma saani shorts reels",

        "black sheep",

        "parithabangal",

        "gopi sudhakar",

        "vijay tv comedy shorts",

        // Tamil topics
        "tamil love",
        "tamil comedy",
        "tamil friendship",
        "tamil couple",
        "tamil relationship",
        "tamil funny"
      ];

      const q = customQuery.toLowerCase();

      let selectedQueries = queries;

      if (q.includes("love") || q.includes("crush") || q.includes("couple")) {
        queries = [...loveQueries, ...creatorQueries];
      } else if (q.includes("comedy") || q.includes("funny") || q.includes("cmdy")) {
        queries = [...comedyQueries, ...creatorQueries];
      } else if (q.includes("friend") || q.includes("friendship")) {
        queries = [...friendshipQueries, ...creatorQueries];
      } else {
        queries = [
          ...loveQueries,
          ...comedyQueries,
          ...friendshipQueries,
          ...creatorQueries
        ];
      }

      const randomQuery =
        customQuery.trim() ||
        queries[Math.floor(Math.random() * queries.length)];

      const res = await API.get("/youtube/shorts-feed", {
        params: {
          q: randomQuery,
          category: "SHORT",
          fresh: Date.now(),
        },
      });

      const blockedWords = [
        "trailer", "teaser", "promo", "official trailer", "official teaser",
        "first look", "glimpse","vlogs",

        "full movie", "movie review", "review", "reaction", "explained",
        "story explained", "interview", "press meet", "audio launch",

        "serial", "episode", "episodes", "web series", "webseries",
        "news", "breaking", "live news", "politics",

        "status", "whatsapp status", "bgm status", "lyrical",

        "hindi", "bollywood", "telugu", "tollywood", "malayalam",
        "kannada", "bhojpuri", "punjabi", "urdu", "bengali", "marathi"
      ];

      const tamilKeywords = [
        "tamil",
        "tamizh",
        "kollywood",
        "tamil love",
        "tamil couple",
        "tamil friend",
        "tamil friendship",
        "tamil comedy",
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

      const watched =
        JSON.parse(localStorage.getItem("visionArcSeenReels")) || [];

      const freshReels = filtered.filter(
        (video) => !watched.includes(video.videoId)
      );

      // const watched =
      //   JSON.parse(localStorage.getItem("watchedReels")) || [];

      // const freshReels = filtered.filter(
      //   (video) => !watched.includes(video.videoId)
      // );

      const finalReels =
        freshReels.length > 0 ? freshReels : filtered;

      const shuffled = [...finalReels];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

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

  // const sendMessage = (text) => {
  //   if (!stompClientRef.current) return;

  //   stompClientRef.current.send(
  //     "/app/chat.send",
  //     {},
  //     JSON.stringify({
  //       roomCode,
  //       sender: userName,
  //       text,
  //       replyTo: replyTo
  //         ? {
  //           sender: replyTo.sender,
  //           text: replyTo.text,
  //         }
  //         : null,
  //     })
  //   );
  // };

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

  const getNextSuggestion = () => {
    const currentId = selectedMovieRef.current?.videoUrl;

    const availableVideos = roomYoutubeResults.filter(
      (video) => video?.videoId && video.videoId !== currentId
    );

    if (availableVideos.length > 0) {
      return availableVideos[Math.floor(Math.random() * availableVideos.length)];
    }

    return null;
  };

  const showNextSuggestionCard = async () => {
    let suggestion = getNextSuggestion();

    if (!suggestion) {
      if (activeCategoryRef.current === "MUSIC") {
        await loadTamilMusic();
      } else {
        await loadTamilMovies();
      }

      setTimeout(() => {
        const newSuggestion = getNextSuggestion();
        setNextSuggestion(newSuggestion);
      }, 300);

      return;
    }

    setNextSuggestion(suggestion);
  };

  const playNextSuggestion = () => {
    if (!nextSuggestion) return;

    selectYoutubeVideo(
      nextSuggestion,
      true,
      activeCategoryRef.current === "MUSIC" ? "MUSIC" : "MOVIE"
    );
  };

  const sendReelComment = () => {
    const text = reelComment.trim();
    if (!text) return;

    stompClientRef.current?.send(
      "/app/room.sync",
      {},
      JSON.stringify({
        roomCode,
        action: "REEL_COMMENT",
        userName: getSafeUserName(),
        text: text,
      })
    );

    setReelComment("");
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
            ×
          </button>

          <div className="shorts-only-room">{roomCode}</div>
          {/* {showHeart && <div className="big-like-heart">💜</div>} */}

          <div className="floating-comments">
            {floatingComments.map((c) => (
              <div key={c.id} className="floating-comment">
                <strong>{c.user}</strong>: {c.text}
              </div>
            ))}
          </div>

          <div className="reel-sync-message-bar">
            <input
              value={reelComment}
              onChange={(e) => setReelComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendReelComment();
              }}
              placeholder="Share your thoughts..."
            />
            <button onClick={sendReelComment}>Send</button>
          </div>
        </div>
      </div>
    );
  }

  // const roomClientIdRef = useRef(
  //   sessionStorage.getItem("roomClientId") || crypto.randomUUID()
  // );

  // useEffect(() => {
  //   sessionStorage.setItem("roomClientId", roomClientIdRef.current);
  // }, []);

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
                        switchRoomCategory("MOVIE");
                        setShowCategoryMenu(false);
                      }}
                    >
                      🎬 Movies
                    </button>
                  )}

                  {activeCategory !== "MUSIC" && (
                    <button
                      onClick={() => {
                        switchRoomCategory("MUSIC");
                        setShowCategoryMenu(false);
                      }}
                    >
                      🎵 Music
                    </button>
                  )}

                  {activeCategory !== "SHORT" && (
                    <button
                      onClick={() => {
                        switchRoomCategory("SHORT");
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
            <div className="room-top-actions">
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

              {/* <button className="room-back-btn" onClick={goBack}>
                ← Back
              </button> */}
            </div>
          )}
          <div className="room-search-row">

            <div className="room-search-wrapper">
              <button className="room-search-btn" onClick={() => searchYoutubeInsideRoom()}>
                🔍
              </button>

              <input
                className="room-mobile-search"
                value={movieSearch}
                onChange={(e) => handleSearchTyping(e.target.value)}
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
                onClick={() => {
                  if (movieSearch.trim().length >= 3) {
                    searchYoutubeInsideRoom(movieSearch.trim());
                    return;
                  }

                  if (activeCategory === "SHORT") loadTamilReels();
                  else if (activeCategory === "MUSIC") loadTamilMusic(true);
                  else loadTamilMovies(true);
                }}
              >
                🔄
              </button>
            </div>
            <button
              className="room-back-btn"
              onClick={goBack}
            >
              Back
            </button>
          </div>
          {/* {searchSuggestions.length > 0 && (
            <div className="youtube-like-suggestions">
              {searchSuggestions.map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  className="youtube-like-suggestion-item"
                  onClick={() => {
                    setMovieSearch(item.title);
                    setSearchSuggestions([]);
                    searchYoutubeInsideRoom(item.title);
                  }}
                >
                  <span className="suggestion-left-icon">🔍</span>

                  <span className="suggestion-title">
                    {item.title}
                  </span>

                  {item.thumbnail && (
                    <img
                      className="suggestion-thumb"
                      src={item.thumbnail}
                      alt={item.title}
                    />
                  )}
                </button>
              ))}
            </div>
          )} */}
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
                <div className="page-loader">
                  <div className="loader"></div>
                  <span>Loading...</span>
                </div>
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
                            JSON.parse(localStorage.getItem("visionArcSeenReels")) || [];

                          watched.push(video.videoId);

                          localStorage.setItem(
                            "visionArcSeenReels",
                            JSON.stringify([...new Set(watched)])
                          );

                          const shuffledFeed = [...roomYoutubeResults].sort(
                            () => Math.random() - 0.5
                          );

                          sessionStorage.setItem(
                            "shortsFeed",
                            JSON.stringify(shuffledFeed)
                          );

                          sessionStorage.setItem(
                            "shortsStartVideoId",
                            video.videoId
                          );

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
                    <div
                      className="music-progress"
                      onClick={seekByProgress}
                      onTouchMove={seekByProgress}
                    >                      <div
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

                  {nextSuggestion && activeCategory === "MUSIC" && (
                    <div className="up-next-card">
                      <div className="up-next-label">Up Next</div>
                      <div className="up-next-content">
                        <img src={nextSuggestion.thumbnail} alt={nextSuggestion.title} />
                        <div className="up-next-info">
                          <h4>{nextSuggestion.title}</h4>
                          <button onClick={playNextSuggestion}>Play Now</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* <h3>Suggested Songs</h3> */}

              {musicSearched && (
                <div className="suggested-music-grid">
                  {roomYoutubeResults.map((video) => (
                    <div
                      key={video.videoId}
                      className="suggested-song-card"
                      onClick={() => selectYoutubeVideo(video, true, "MUSIC")}
                    >
                      <img src={video.thumbnail} alt={video.title} />
                      <p>{video.title}</p>
                    </div>
                  ))}
                </div>
              )}

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
                    {activeCategory !== "SHORT" && (
                      <div
                        className="video-full-progress"
                        onClick={seekByProgress}
                        onTouchMove={seekByProgress}
                      >
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
                    )}

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
                {nextSuggestion && activeCategory !== "SHORT" && (
                  <div className="up-next-card">
                    <div className="up-next-label">Up Next</div>
                    <div className="up-next-content">
                      <img src={nextSuggestion.thumbnail} alt={nextSuggestion.title} />
                      <div className="up-next-info">
                        <h4>{nextSuggestion.title}</h4>
                        <button onClick={playNextSuggestion}>Play Now</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCategory === "SHORT" && (
                  <>
                    <div className="shorts-header">
                      <button
                        className="shorts-back-btn"
                        onClick={goBack}
                      >
                        ×
                      </button>

                      <div className="shorts-room-pill">
                        {roomCode}
                      </div>
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

                    <div className="reel-sync-message-bar">
                      <input
                        value={reelComment}
                        onChange={(e) => setReelComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendReelComment();
                        }}
                        placeholder="Sync a comment..."
                      />

                      <button onClick={sendReelComment}>
                        Send
                      </button>
                    </div>
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
                  {user === roomHostName && <span className="host-badge"> 👑 Host</span>}
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