import { useEffect, useState } from "react";
import { API, getMoviePoster, getMoviePreview } from "../api";
import Header from "../components/Header";

export default function AdminPage() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  if (!isAdmin) {
    return (
      <div className="page center-page">
        <h2>Access denied</h2>
        <p>Only admin can access this page.</p>
      </div>
    );
  }

  const [groupTitle, setGroupTitle] = useState("");
  const [partTitle, setPartTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [driveVideoFileId, setDriveVideoFileId] = useState("");
  const [drivePosterFileId, setDrivePosterFileId] = useState("");
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserMobile, setEditUserMobile] = useState("");
  const [showUsers, setShowUsers] = useState(false);

  const userName = localStorage.getItem("userName") || "Guest";

  const loadMovies = async () => {
    const res = await API.get("/movies");
    setMovies(res.data);
  };

  const loadUsers = async () => {
    const res = await API.get("/auth/users");
    setUsers(res.data);
  };

  useEffect(() => {
    loadMovies();
    loadUsers();
  }, []);

  const resetForm = () => {
    setGroupTitle("");
    setPartTitle("");
    setPartNumber("");
    setDescription("");
    setDriveVideoFileId("");
    setDrivePosterFileId("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      groupTitle,
      partTitle,
      partNumber: Number(partNumber),
      description,
      driveVideoFileId,
      drivePosterFileId,
    };

    if (editingId) {
      await API.put(`/admin/movies/${editingId}`, payload);
      setMessage("Movie updated ✅");
    } else {
      await API.post("/admin/movies", payload);
      setMessage("Movie added ✅");
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
    setDriveVideoFileId(movie.driveVideoFileId || "");
    setDrivePosterFileId(movie.drivePosterFileId || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteMovie = async (id) => {
    if (!confirm("Delete this movie?")) return;
    await API.delete(`/admin/movies/${id}`);
    loadMovies();
  };

  const editUser = (user) => {
    setEditingUserId(user.id);
    setEditUserName(user.name || "");
    setEditUserMobile(user.mobile || "");
  };

  const updateUser = async () => {
    await API.put(`/auth/users/${editingUserId}`, {
      name: editUserName,
      mobile: editUserMobile,
      loginMethod: "MOBILE",
      admin: false,
    });

    setEditingUserId(null);
    setEditUserName("");
    setEditUserMobile("");
    loadUsers();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    await API.delete(`/auth/users/${id}`);
    loadUsers();
  };

  return (
    <div className="page admin-page-bg">
      <Header
        userName={userName}
        onUsersClick={() => setShowUsers(!showUsers)}
      />

      {showUsers && (
        <div className="users-popup">
          <h3>Logged In Users</h3>
          {/* <h3>Logged In Users</h3> */}

          <button
            className="btn-secondary small-btn"
            onClick={() => setShowUsers(false)}
          >
            Back
          </button>

          {users.map((user) => (
            <div key={user.id} className="user-popup-item">
              {editingUserId === user.id ? (
                <>
                  <input
                    className="input-modern"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                  />

                  <input
                    className="input-modern"
                    value={editUserMobile}
                    onChange={(e) => setEditUserMobile(e.target.value)}
                  />

                  <button className="btn-primary" onClick={updateUser}>
                    Save
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {user.name} ({user.mobile || "Guest"})
                  </span>

                  <div className="popup-user-actions">
                    <button onClick={() => editUser(user)}>Edit</button>
                    <button onClick={() => deleteUser(user.id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="admin-layout">
        <div className="admin-form-card">
          <div className="section-badge">Admin Panel</div>

          <h2 className="section-title">
            {editingId ? "Edit Movie" : "Add Google Drive Movie"}
          </h2>

          {message && <div className="login-message">{message}</div>}

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label>Group Title</label>
              <input
                className="input-modern"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Movie Name"
              />
            </div>

            <div className="admin-field">
              <label>Part Title</label>
              <input
                className="input-modern"
                value={partTitle}
                onChange={(e) => setPartTitle(e.target.value)}
                placeholder="Full Movie"
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
              />
            </div>

            <div className="admin-field">
              <label>Description</label>
              <textarea
                className="input-modern admin-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="admin-field">
              <label>Google Drive Video File ID</label>
              <input
                className="input-modern"
                value={driveVideoFileId}
                onChange={(e) =>
                  setDriveVideoFileId(e.target.value.trim())
                }
              />
            </div>

            <div className="admin-field">
              <label>Google Drive Poster File ID</label>
              <input
                className="input-modern"
                value={drivePosterFileId}
                onChange={(e) =>
                  setDrivePosterFileId(e.target.value.trim())
                }
              />
            </div>

            <button
              className="btn-primary admin-submit-btn"
              type="submit"
            >
              {editingId ? "Update Movie" : "Save Movie"}
            </button>
          </form>
        </div>

        <div className="admin-list-card">
          <h2 className="section-title">Uploaded Movies</h2>

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
                    <button
                      className="btn-secondary"
                      onClick={() => editMovie(movie)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() => deleteMovie(movie.id)}
                    >
                      Delete
                    </button>

                    <a
                      href={getMoviePreview(movie)}
                      target="_blank"
                      rel="noreferrer"
                      className="admin-preview-link"
                    >
                      <button className="admin-action-btn">
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