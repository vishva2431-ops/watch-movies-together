import { useEffect, useState } from "react";
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

  useEffect(() => {
    loadTamilShorts();
  }, []);

  const loadTamilShorts = async () => {
    try {
      setLoading(true);

      const mixedQueries = [
        "tamil reels comedy love friendship trending shorts",
        "tamil viral shorts comedy couples food dance reels",
        "tamil funny reels love proposal college friends shorts",
        "tamil trending reels comedy love sad motivation shorts",
        "tamil cinema shorts comedy love songs friendship reels",
        "tamil reels funny couple friendship dance college",
        "tamil viral reels comedy romance friends food shorts",
        "tamil shorts mix comedy love music dance reels"
      ];

      const randomQuery =
        mixedQueries[Math.floor(Math.random() * mixedQueries.length)];

      const res = await API.get("/youtube/search", {
        params: {
          q: search.trim() || randomQuery,
          category: "SHORT",
        },
      });

      const shuffled = [...res.data].sort(() => Math.random() - 0.5);
      setShorts(shuffled);

    } catch (err) {
      console.error("SHORTS ERROR:", err);
      console.error("BACKEND RESPONSE:", err.response?.data);

      alert(err.response?.data?.message || "Unable to load shorts");
    } finally {
      setLoading(false);
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

    navigate(`/room/${res.data.roomCode}`);
  };

  const toggleLike = (videoId, e) => {
    e.stopPropagation();
    setLiked((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  return (
    <div className="page shorts-feed-page">
      <Header userName={currentUser} />

      <div className="shorts-feed-top">

        {/* Row 1 */}
        <div className="shorts-row1">
          <h2 className="shorts-page-title">Vision Arc</h2>

          <button
            className="btn-secondary shorts-back-btn"
            onClick={() => navigate("/home")}
          >
            Back
          </button>
        </div>

        {/* Row 2 */}
        <div className="shorts-search-box">
          <button
            className="search-icon-btn"
            onClick={loadTamilShorts}
          >
            🔍
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadTamilShorts();
            }}
            placeholder="Search Tamil reels..."
          />

          <button
            className="refresh-btn"
            onClick={loadTamilShorts}
          >
            🔄
          </button>

        </div>

      </div>

      {/* <div className="shorts-title-row">
        <h1>⚡ Tamil Reels</h1>
        <p>Click any reel, then scroll/swipe inside the room.</p>
      </div> */}

      {loading && <p className="empty-state">Loading latest reels...</p>}

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
    </div>
  );
}