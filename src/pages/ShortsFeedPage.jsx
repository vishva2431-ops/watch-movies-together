import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import Header from "../components/Header";

export default function ShortsFeedPage() {
  const navigate = useNavigate();
  const currentUser = localStorage.getItem("userName") || "Guest";

  const [shorts, setShorts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [liked, setLiked] = useState({});
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const suggestionTimerRef = useRef(null);
  const searchAreaRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const loadedIdsRef = useRef(new Set());

  const REEL_HISTORY_KEY = "visionArcSeenReels";
  const MAX_SEEN_REELS = 300;


  useEffect(() => {
    loadTamilShorts();
  }, []);

  useEffect(() => {
    const closeSuggestions = (event) => {
      if (searchAreaRef.current && !searchAreaRef.current.contains(event.target)) {
        setSearchSuggestions([]);
      }
    };

    document.addEventListener("mousedown", closeSuggestions);
    document.addEventListener("touchstart", closeSuggestions);

    return () => {
      document.removeEventListener("mousedown", closeSuggestions);
      document.removeEventListener("touchstart", closeSuggestions);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 700;

      if (nearBottom && !loadingMoreRef.current) {
        loadTamilShorts("", true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [search]);

  const getSeenReels = () => {
    try {
      return JSON.parse(localStorage.getItem(REEL_HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  };

  const saveSeenReels = (newIds) => {
    const oldIds = getSeenReels();
    const merged = [...oldIds, ...newIds];
    const unique = [...new Set(merged)].slice(-MAX_SEEN_REELS);

    localStorage.setItem(REEL_HISTORY_KEY, JSON.stringify(unique));
  };

 const isValidReel = (video) => {
  const text = `${video.title || ""} ${video.description || ""}`.toLowerCase();

  const blockedWords = [
    "full movie", "movie", "web series", "webseries", "episode",
    "serial", "trailer", "teaser", "review", "reaction", "explained",
    "news", "interview", "promo", "podcast", "cringe",

    "hindi", "bollywood", "bhojpuri", "punjabi", "haryanvi",
    "gujarati", "gujju", "telugu", "tollywood",
    "malayalam", "kannada", "marathi", "bengali",

    "desi", "north indian", "vadakan", "vadakkans",
    "vlog", "food", "travel"
  ];

  const allowedWords = [
    "tamil", "english",
    "tamil short", "tamil shorts", "tamil reel", "tamil reels",
    "love tamil", "tamil couple", "tamil romantic", "tamil relationship",
    "tamil comedy", "tamil funny", "tamil friend", "tamil friendship",
    "mallesh", "malleshkannan", "vijay tv", "kathadi club","tamil content creators",
  ];

  const blocked = blockedWords.some((word) => text.includes(word));
  const allowed = allowedWords.some((word) => text.includes(word));

  return !blocked && (allowed || video.category === "SHORT");
};

  const loadTamilShorts = async (customSearch = "", append = false) => {
    try {
      if (loadingMoreRef.current) return;

      loadingMoreRef.current = true;
      setLoading(true);

      const mixedQueries = [
        "latest tamil love reels shorts",
        "latest tamil couple reels shorts",
        "latest tamil romantic reels shorts",
        "latest tamil relationship reels shorts",
        "latest tamil love status shorts",
        "latest english love reels shorts",
        "latest couple reels shorts with tamil songs",
        "latest tamil friendship reels shorts",
        "latest tamil comedy reels shorts",
        "latest tamil funny reels shorts",
        "new viral love reels shorts tamil",
        "new trending couple reels shorts tamil",
        "latest tamil content creator shorts reels",
        "malleshkannan",
        "kathadi club"
      ];

      const randomQuery =
        mixedQueries[Math.floor(Math.random() * mixedQueries.length)];

      const finalQuery = customSearch.trim() || search.trim() || randomQuery;

      // const res = await API.get("/youtube/search", {
      //   params: {
      //     q: finalQuery,
      //     category: "SHORT",
      //   },
      // });

      const seenReels = getSeenReels().slice(-300);

const res = await API.get("/youtube/shorts-feed", {
    params: {
        seenIds: seenReels.join(","),
    },
});

      // const seenReels = getSeenReels();

      let cleanReels = res.data
        .filter(isValidReel)
        .filter((video) => video?.videoId)
        .filter((video) => {
          if (loadedIdsRef.current.has(video.videoId)) return false;
          if (seenReels.includes(video.videoId)) return false;

          loadedIdsRef.current.add(video.videoId);
          return true;
        });

      // if (cleanReels.length < 5) {
      //   cleanReels = res.data
      //     .filter(isValidReel)
      //     .filter((video) => video?.videoId)
      //     .filter((video) => !loadedIdsRef.current.has(video.videoId));

      //   cleanReels.forEach((video) => loadedIdsRef.current.add(video.videoId));
      // }

      saveSeenReels(cleanReels.map((video) => video.videoId));

      const shuffled = [...cleanReels];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      if (append) {
        setShorts((prev) => [...prev, ...shuffled]);
      } else {
        loadedIdsRef.current = new Set(shuffled.map((v) => v.videoId));
        setShorts(shuffled);
      }
    } catch (err) {
      console.error("SHORTS ERROR:", err);
      console.error("BACKEND RESPONSE:", err.response?.data);

      setPopupMessage(
        err.response?.data?.message || "Unable to load shorts"
      );
      setShowPopup(true);
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  };

  const openShortRoom = async (shortVideo) => {
    const res = await API.post("/rooms/create", {
      userName: currentUser,
      youtubeVideoId: shortVideo.videoId,
      youtubeTitle: shortVideo.title,
      youtubeThumbnail: shortVideo.thumbnail,
      category: "SHORT",
    });

    sessionStorage.setItem("shortsFeed", JSON.stringify(shorts));
    sessionStorage.setItem("shortsStartVideoId", shortVideo.videoId);

    navigate(`/room/${res.data.roomCode}?play=true`);
  };

  const toggleLike = (videoId, e) => {
    e.stopPropagation();
    setLiked((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const handleSearchTyping = (value) => {
    setSearch(value);
    clearTimeout(suggestionTimerRef.current);

    if (!value.trim() || value.trim().length < 3) {
      setSearchSuggestions([]);
      return;
    }

    suggestionTimerRef.current = setTimeout(async () => {
      try {
        const res = await API.get("/youtube/suggestions", {
          params: {
            q: `${value} reels shorts`,
            category: "SHORT",
          },
        });

        const cleanTitle = (title) => {
          return title
            .replace(/#\S+/g, "")
            .replace(/\|.*/g, "")
            .replace(/-.*/g, "")
            .replace(/\bshorts?\b/gi, "")
            .replace(/\breels?\b/gi, "")
            .replace(/\btamil\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();
        };

        const suggestions = res.data
          .filter(isValidReel)
          .filter((item) => item?.title)
          .map((item) => ({
            title: cleanTitle(item.title),
            originalTitle: item.title,
            thumbnail: item.thumbnail,
          }))
          .filter((item) => item.title.length > 3)
          .slice(0, 8);

        setSearchSuggestions(suggestions);
      } catch {
        setSearchSuggestions([]);
      }
    }, 1000);
  };

  return (
    <div className="page shorts-feed-page">
      <Header userName={currentUser} />

      <div className="shorts-feed-top" ref={searchAreaRef}>
        <div className="shorts-row1">
          <h2 className="shorts-page-title">Vision Arc</h2>

          <button
            className="btn-secondary shorts-back-btn"
            onClick={() => navigate("/home")}
          >
            Back
          </button>
        </div>

        <div className="shorts-search-box">
          <button className="search-icon-btn" onClick={() => loadTamilShorts()}>
            🔍
          </button>

          <input
            value={search}
            onChange={(e) => handleSearchTyping(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadTamilShorts();
            }}
            placeholder="Search Tamil reels..."
          />

          <button className="refresh-btn" onClick={() => loadTamilShorts()}>
            🔄
          </button>
        </div>

        {searchSuggestions.length > 0 && (
          <div className="youtube-like-suggestions">
            {searchSuggestions.map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                className="youtube-like-suggestion-item"
                onClick={() => {
                  setSearch(item.title);
                  setSearchSuggestions([]);
                  loadTamilShorts(item.originalTitle || item.title);
                }}
              >
                <span className="suggestion-left-icon">🔍</span>
                <span className="suggestion-title">{item.title}</span>

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
        )}
      </div>

      {loading && shorts.length === 0 && (
        <p className="empty-state">Loading latest reels...</p>
      )}

      {!loading && shorts.length === 0 && (
        <p className="empty-state">
          No reels found. Click refresh or search another word.
        </p>
      )}

      <div className="reels-grid">
        {shorts.map((item, index) => (
          <div
            className="reel-card"
            key={item.videoId}
            onClick={() => openShortRoom(item)}
          >
            <img src={item.thumbnail} alt={item.title} />

            <div className="reel-overlay">
              <button onClick={(e) => toggleLike(item.videoId, e)}>
                {liked[item.videoId] ? "❤️" : "🤍"}
              </button>

              <span>👁 {(index + 1) * 108}K</span>
            </div>

            <div className="reel-title">{item.title}</div>
          </div>
        ))}
      </div>

      {loading && shorts.length > 0 && (
        <p className="empty-state">Loading more reels...</p>
      )}

      {showPopup && (
        <div className="custom-popup-overlay">
          <div className="custom-popup">
            <h2>Vision Arc</h2>

            <p>{popupMessage}</p>

            <button
              className="custom-popup-btn"
              onClick={() => setShowPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}