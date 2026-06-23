import { useEffect, useMemo, useState } from "react";
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

    const navigate = useNavigate();
    const currentUser = localStorage.getItem("userName") || "Guest";

    useEffect(() => {
        API.get("/movies")
            .then((res) => setMovies(res.data))
            .catch(console.error);
    }, []);


    useEffect(() => {
        discoverContent();
    }, []);



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

    const discoverContent = async () => {
        const queries = {
            MOVIE: [
                "latest released tamil full movie",
                "new tamil full movie hd",
                "latest tamil dubbed full movie",
                "new tamil dubbed full movie hd",
                "tamil web series full episodes",
                "tamil dubbed web series full episodes",
                "latest tamil webseries full episode",
                "latest tamil dubbed webseries full episode"
            ],
            MUSIC: [
                "tamil latest songs",
                "tamil old songs",
                "tamil melody songs",
                "tamil trending songs"
            ],
            SHORT: [
                "tamil reels comedy love friendship shorts",
                "tamil viral reels",
                "tamil funny shorts"
            ]
        };

        const randomQuery =
            queries[category][
            Math.floor(Math.random() * queries[category].length)
            ];

        const res = await API.get("/youtube/search", {
            params: {
                q: randomQuery,
                category,
            },
        });

        setYoutubeResults(
            [...res.data].sort(() => Math.random() - 0.5)
        );
    };
    const searchYoutube = async () => {
        if (!search.trim()) {
            setAlertMessage("Please enter something to search");
            return;
        }

        try {
            setLoading(true);

            const categoryKeyword =
                category === "MOVIE"
                    ? "tamil full movie OR tamil dubbed full movie OR tamil webseries full episode OR tamil dubbed webseries"
                    : category === "MUSIC"
                        ? "tamil song"
                        : "tamil shorts";

            const res = await API.get("/youtube/search", {
                params: {
                    q: `${search.trim()} ${categoryKeyword}`,
                    category,
                },
            });

            setYoutubeResults(res.data);
        } catch (err) {
            console.error(err);
            setAlertMessage("YouTube search failed. Check backend/API key.");
        } finally {
            setLoading(false);
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

            <div className="category-page-header-clean">

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
                        onClick={searchYoutube}
                        disabled={loading}
                    >
                        🔍
                    </button>

                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") searchYoutube();
                        }}
                        placeholder={config.placeholder}
                    />

                    <button
                        className="category-refresh-icon-btn"
                        onClick={discoverContent}
                    >
                        🔄
                    </button>
                </div>

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
            <h2 className="section-title">Admin Uploaded {config.title}</h2>

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
            )}
        </div>
    );
}