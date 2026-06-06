import { useEffect, useState } from "react";
import { API, extractYouTubeId, getMoviePoster, getMoviePreview } from "../api";
import Header from "../components/Header";

export default function AdminPage() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const [groupTitle, setGroupTitle] = useState("");
  const [partTitle, setPartTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [users, setUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);

  const userName = localStorage.getItem("userName") || "Admin";

  const loadMovies = async () => {
    const res = await API.get("/movies");
    setMovies(res.data);
  };

 const loadUsers = async () => {
  const res = await API.get("/auth/users");

  const latestFirst = [...res.data].sort((a, b) => {
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  setUsers(latestFirst);
};

  useEffect(() => {
    if (isAdmin) {
      loadMovies();
      loadUsers();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="page center-page">
        <div className="login-card">
          <h2>Access Denied</h2>
          <p>Only admin can access this page.</p>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setGroupTitle("");
    setPartTitle("");
    setPartNumber("");
    setDescription("");
    setVideoUrl("");
    setPosterUrl("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const youtubeId = extractYouTubeId(videoUrl);

    const payload = {
      groupTitle,
      partTitle,
      partNumber: Number(partNumber),
      description,
      videoUrl: youtubeId,
      posterUrl,
    };

    if (editingId) {
      await API.put(`/admin/movies/${editingId}`, payload);
      setMessage("YouTube video updated ✅");
    } else {
      await API.post("/admin/movies", payload);
      setMessage("YouTube video added ✅");
    }

    resetForm();
    loadMovies();
  };

  const editMovie = (movie) => {
    setEditingId(movie.id);
    setGroupTitle(movie.groupTitle || "");
    setPartTitle(movie.partTitle || "");
    setPartNumber(movie.partNumber || "");
    setDescription(movie.description || "");
    setVideoUrl(movie.videoUrl || "");
    setPosterUrl(movie.posterUrl || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMovie = async (id) => {
    if (!confirm("Delete this video?")) return;
    await API.delete(`/admin/movies/${id}`);
    loadMovies();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    await API.delete(`/auth/users/${id}`);
    loadUsers();
  };

  return (
    <div className="page admin-page-bg">
      <Header userName={userName} onUsersClick={() => setShowUsers(!showUsers)} />

      {showUsers && (
        <div className="users-popup">
          <h3>Logged In Users</h3>

          <button className="btn-secondary small-btn" onClick={() => setShowUsers(false)}>
            Back
          </button>

          {users.map((user) => (
            <div key={user.id} className="user-popup-item">
              <span>Name: {user.name || "-"}</span>
              <span>Mobile: {user.mobile || "-"}</span>
              <span>Email: {user.email || "-"}</span>
              <span>Login: {user.loginProvider || "-"}</span>

              <div className="popup-user-actions">
                <button onClick={() => deleteUser(user.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-layout">
        <div className="admin-form-card">
          <div className="section-badge">Admin Panel</div>

          <h2 className="section-title">
            {editingId ? "Edit YouTube Video" : "Add YouTube Video"}
          </h2>

          {message && <div className="login-message">{message}</div>}

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label>Movie / Music Group Title</label>
              <input
                className="input-modern"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Example: Vikram Movie"
                required
              />
            </div>

            <div className="admin-field">
              <label>Part Title</label>
              <input
                className="input-modern"
                value={partTitle}
                onChange={(e) => setPartTitle(e.target.value)}
                placeholder="Example: Part 1 / Full Video"
                required
              />
            </div>

            <div className="admin-field">
              <label>Part Number</label>
              <input
                className="input-modern"
                type="number"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="1"
                required
              />
            </div>

            <div className="admin-field">
              <label>Description</label>
              <textarea
                className="input-modern admin-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Small description"
              />
            </div>

            <div className="admin-field">
              <label>YouTube Video ID / YouTube URL</label>
              <input
                className="input-modern"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value.trim())}
                placeholder="Paste YouTube URL or video ID"
                required
              />

              <label>Poster URL Optional</label>
              <input
                className="input-modern"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value.trim())}
                placeholder="Leave empty to use YouTube thumbnail"
              />
            </div>

            <button className="btn-primary admin-submit-btn" type="submit">
              {editingId ? "Update Video" : "Save Video"}
            </button>
          </form>
        </div>

        <div className="admin-list-card">
          <h2 className="section-title">Uploaded YouTube Videos</h2>

          <div className="admin-movie-list">
            {movies.map((movie) => (
              <div className="admin-movie-item" key={movie.id}>
                <img
                  src={getMoviePoster(movie)}
                  alt={movie.groupTitle}
                  className="admin-movie-poster"
                />

                <div className="admin-movie-info">
                  <h3>{movie.groupTitle}</h3>
                  <p>{movie.partTitle}</p>
                  <p>{movie.description}</p>

                  <div className="movie-card-actions">
                    <button className="btn-secondary" onClick={() => editMovie(movie)}>
                      Edit
                    </button>

                    <button className="btn-secondary" onClick={() => deleteMovie(movie.id)}>
                      Delete
                    </button>

                    <a
                      href={getMoviePreview(movie)}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-preview-link"
                    >
                      <button type="button" className="admin-action-btn">
                        Preview
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}