import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api";
import Header from "../components/Header";
import MovieCard from "../components/MovieCard";

const CATEGORY_CONFIG = {
    MOVIE: {
        emoji: "🎬",
        title: "Movies",
        placeholder: "Search movies...",
        subtitle: "Search trailers, full movies, scenes and admin uploaded movie content.",
    },
    MUSIC: {
        emoji: "🎵",
        title: "Music",
        placeholder: "Search music...",
        subtitle: "Search songs, albums, live performances and music videos.",
    },
    SHORT: {
        emoji: "⚡",
        title: "Shorts",
        placeholder: "Search shorts...",
        subtitle: "Create one shorts room, then swipe up/down inside the room like reels.",
    },
};

export default function CategoryPage({ category }) {
    const config = CATEGORY_CONFIG[category];

    const [movies, setMovies] = useState([]);
    const [search, setSearch] = useState("");
    const [youtubeResults, setYoutubeResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    // const [loading, setLoading] = useState(false);


    const suggestionTimerRef = useRef(null);
    const searchAreaRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const loadedVideoIdsRef = useRef(new Set());
    const discoverIndexRef = useRef(0);

    const navigate = useNavigate();
    const currentUser = localStorage.getItem("userName") || "Guest";

    useEffect(() => {
        API.get("/movies")
            .then((res) => setMovies(res.data))
            .catch(console.error);
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
        if (loading) return;
        discoverContent();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const nearBottom =
                window.innerHeight + window.scrollY >= document.body.offsetHeight - 700;

            if (!nearBottom || loadingMoreRef.current) return;

            if (search.trim().length >= 3) {
                searchYoutube(search.trim(), true);
            } else {
                discoverContent(true);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [category, search]);

    const adminVideos = useMemo(() => {
        const value = search.toLowerCase();

        return movies.filter(
            (movie) =>
                (movie.category || "MOVIE") === category &&
                ((movie.groupTitle || "").toLowerCase().includes(value) ||
                    (movie.partTitle || "").toLowerCase().includes(value))
        );
    }, [movies, search, category]);

    const createRoomFromMovie = async (movieId) => {
        const res = await API.post("/rooms/create", {
            movieId,
            userName: currentUser,
            category,
        });

        navigate(`/room/${res.data.roomCode}`);
    };

    const createRoomFromYoutube = async (video) => {
        const res = await API.post("/rooms/create", {
            userName: currentUser,
            youtubeVideoId: video.videoId,
            youtubeTitle: video.title,
            youtubeThumbnail: video.thumbnail,
            category,
        });

        navigate(`/room/${res.data.roomCode}`);
    };

    const createShortsRoom = async () => {
        const res = await API.post("/rooms/create", {
            userName: currentUser,
            category: "SHORT",
        });

        navigate(`/room/${res.data.roomCode}`);
    };

    const discoverContent = async (append = false) => {
        const queries = {
            MOVIE: [
                "latest tamil movie trailer",
                "latest tamil teaser",
                "new tamil movie",
                "latest netflix tamil",
                "amazon prime tamil movie",
                "latest disney hotstar tamil",
                "latest tamil web series",
                "latest investigation thriller tamil",
                "latest action movie tamil",
                "latest romantic movie tamil",
                "latest comedy movie tamil",
                "latest hollywood tamil dubbed",
                "latest korean drama tamil dubbed",
                "latest anime tamil dubbed",
                "latest tamil vlog",
                "latest irfan view",
                "latest vj siddhu vlog",
                "latest black sheep video"
            ],
            MUSIC: [
                "latest tamil songs official music video",
                "new tamil songs official music video",
                "trending tamil songs official music video",
                "latest tamil melody songs official music video",
                "latest tamil romantic songs official music video",
                "latest english songs official music video",
                "new english songs official music video",
                "trending english songs official music video",
                "latest english pop songs official music video",
                "latest english romantic songs official music video"
            ],
            SHORT: [
                "latest tamil love reels shorts",
                "latest tamil couple reels shorts",
                "latest tamil romantic reels shorts",
                "latest tamil relationship reels shorts",
                "latest english love reels shorts",
                "latest couple reels shorts",
                "latest friendship reels shorts",
                "latest tamil comedy reels shorts"
            ]
        };

        // const query =
        //     category === "MUSIC"
        //         ? musicQueries[Math.floor(Math.random() * musicQueries.length)]
        //         : movieQueries[Math.floor(Math.random() * movieQueries.length)];

        if (loadingMoreRef.current) return;

        loadingMoreRef.current = true;

        const list = queries[category];
        const query = list[Math.floor(Math.random() * list.length)];
        discoverIndexRef.current += 1;

        try {
            setLoading(true);

            if (!append) {
                loadedVideoIdsRef.current = new Set();
            }

            const res = await API.get("/youtube/cached-discover", {
                params: {
                    q: query,
                    category,
                    fresh: Date.now(),
                },
            });

            const fresh = res.data.filter((video) => {
                if (!video?.videoId) return false;
                if (loadedVideoIdsRef.current.has(video.videoId)) return false;

                loadedVideoIdsRef.current.add(video.videoId);
                return true;
            });

            setYoutubeResults((prev) => {
                if (!append) return fresh;

                const ids = new Set(prev.map(v => v.videoId));

                return [
                    ...prev,
                    ...fresh.filter(v => !ids.has(v.videoId))
                ];
            });
        } catch (err) {
            console.error("Discover content error:", err);

            // Don't disturb user with popup on auto-discover failure
            setYoutubeResults([]);
        } finally {
            setLoading(false);
            loadingMoreRef.current = false;
        }
    };
    const handleSearchTyping = (value) => {
        setSearch(value);
        clearTimeout(suggestionTimerRef.current);

        const q = value.trim();

        if (q.length < 3) {
            loadedVideoIdsRef.current = new Set();
            discoverContent(false);
            return;
        }

        suggestionTimerRef.current = setTimeout(() => {
            searchYoutube(q);
        }, 400);
    };

    const searchYoutube = async (customSearch = "", append = false) => {
        const finalSearch = customSearch.trim() || search.trim();

        if (!finalSearch) {
            setAlertMessage("Please enter something to search.");
            return;
        }

        if (loadingMoreRef.current) return;

        try {
            loadingMoreRef.current = true;
            setLoading(true);

            if (!append) {
                loadedVideoIdsRef.current = new Set();
            }

            const res = await API.get("/youtube/search", {
                params: {
                    q: finalSearch,
                    category,
                    fresh: append ? Date.now() : undefined,
                },
            });

            const getEpisodeNumber = (title = "") => {
                const match = title.match(/\b(?:ep|episode|part)\s*\.?\s*(\d+)\b/i);
                return match ? Number(match[1]) : 9999;
            };

            const sortedResults = [...res.data].sort((a, b) => {
                const epA = getEpisodeNumber(a.title);
                const epB = getEpisodeNumber(b.title);

                if (epA !== epB) return epA - epB;

                return a.title.localeCompare(b.title);
            });

            const freshResults = sortedResults.filter((video) => {
                if (!video?.videoId) return false;
                if (loadedVideoIdsRef.current.has(video.videoId)) return false;

                loadedVideoIdsRef.current.add(video.videoId);
                return true;
            });

            setYoutubeResults((prev) => {
                if (!append) return freshResults;

                const ids = new Set(prev.map((v) => v.videoId));
                return [...prev, ...freshResults.filter((v) => !ids.has(v.videoId))];
            });

        } catch (err) {
            console.error("YouTube Search Error:", err);

            if (!navigator.onLine) {
                setAlertMessage("📶 No internet connection.");
            } else {
                setAlertMessage(
                    err.response?.data?.message ||
                    "Unable to load videos. Please try again."
                );
            }
        } finally {
            setLoading(false);
            loadingMoreRef.current = false;
        }
    };

    return (
        <div className="page category-page-bg">
            {/* <Header userName={currentUser} /> */}

            {alertMessage && (
                <div className="custom-alert-overlay">
                    <div className="custom-alert-box">
                        <h3>Vision Arc</h3>
                        <p>{alertMessage}</p>
                        <button className="btn-primary" onClick={() => setAlertMessage("")}>
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* <div className="category-top-actions">
    <button className="category-small-back" onClick={() => navigate(-1)}>
         Back
    </button>
</div> */}

            {category === "SHORT" && (
                <div className="shorts-room-banner">
                    <div>
                        <h2>⚡ Reels Mode</h2>
                        <p>Open one room and swipe up/down inside the room to watch next shorts together.</p>
                    </div>

                    <button className="btn-primary" onClick={createShortsRoom}>
                        Open Shorts Room
                    </button>
                </div>
            )}

            <div className="category-page-header-clean" ref={searchAreaRef}>

                <div className="category-row1">
                    <button
                        className="category-small-back"
                        onClick={() => navigate(-1)}
                    >
                        Back
                    </button>
                </div>

                <div className="category-search-clean">
                    <button
                        className="category-search-icon-btn"
                        onClick={() => searchYoutube()}
                        disabled={loading}
                    >
                        🔍
                    </button>

                    <input
                        value={search}
                        onChange={(e) => handleSearchTyping(e.target.value)}
                        placeholder={config.placeholder}
                    />

                    <button
                        className="category-refresh-icon-btn"
                        onClick={() => {
                            if (search.trim().length >= 3) {
                                searchYoutube(search.trim(), false);
                            } else {
                                discoverContent();
                            }
                        }}
                    >
                        🔄
                    </button>
                </div>
                {/* {searchSuggestions.length > 0 && (
                    <div className="youtube-like-suggestions">
                        {searchSuggestions.map((item, index) => (
                            <button
                                key={`${item.title}-${index}`}
                                className="youtube-like-suggestion-item"
                                onClick={() => {
                                    setSearch(item.title);
                                    setSearchSuggestions([]);
                                    searchYoutube(item.title);
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

            {youtubeResults.length > 0 && (
                <>
                    <h2 className="section-title youtube-section-title">YouTube Results</h2>


                    <div className="youtube-result-grid">
                        {youtubeResults.map((video) => (
                            <div className="youtube-result-card" key={video.videoId}>
                                <img src={video.thumbnail} alt={video.title} />

                                <div className="youtube-result-info">
                                    <h3>{video.title}</h3>

                                    <button
                                        className="btn-primary"
                                        onClick={() => createRoomFromYoutube(video)}
                                    >
                                        {category === "SHORT" ? "Open in Shorts Room" : "Create Room"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {loading && (
                <div className="page-loader">
                    <div className="loader"></div>
                    <span>Loading...</span>
                </div>
            )}
            {/* <h2 className="section-title">Admin Uploaded {config.title}</h2>

            {adminVideos.length === 0 ? (
                <div className="empty-state">
                    No admin uploaded {config.title.toLowerCase()} found
                </div>
            ) : (
                <div className="movie-grid">
                    {adminVideos.map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onCreateRoom={createRoomFromMovie}
                        />
                    ))}
                </div>
            )} */}
        </div>
    );
}