import { useEffect, useMemo, useState } from "react";
import { API, buildMediaUrl } from "../api";
import Header from "../components/Header";

const initialForm = {
  groupTitle: "",
  partTitle: "",
  partNumber: "",
  description: "",
};

export default function AdminPage() {
  const [form, setForm] = useState(initialForm);
  const [poster, setPoster] = useState(null);
  const [video, setVideo] = useState(null);
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const userName = localStorage.getItem("userName") || "Guest";

  const loadMovies = async () => {
    try {
      const res = await API.get("/movies");
      setMovies(res.data || []);
    } catch (err) {
      console.error(err);
      setMessage("Unable to load movies ❌");
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setPoster(null);
    setVideo(null);
    setEditingId(null);

    const posterInput = document.getElementById("posterInput");
    const videoInput = document.getElementById("videoInput");
    if (posterInput) posterInput.value = "";
    if (videoInput) videoInput.value = "";
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!form.groupTitle.trim() || !form.description.trim()) {
      setMessage("Group title and description are required");
      return;
    }

    if (!editingId && (!poster || !video)) {
      setMessage("Poster and movie video are required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("groupTitle", form.groupTitle.trim());
      formData.append("partTitle", form.partTitle.trim());
      formData.append("partNumber", form.partNumber.trim());
      formData.append("description", form.description.trim());

      if (poster) formData.append("poster", poster);
      if (video) formData.append("video", video);

      if (editingId) {
        await API.put(`/movies/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Movie updated successfully ✅");
      } else {
        await API.post("/admin/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Movie uploaded successfully ✅");
      }

      resetForm();
      loadMovies();
    } catch (err) {
      console.error(err);
      const errorMessage = err?.response?.data?.message || "Upload failed ❌";
      setMessage(errorMessage);
    }
  };

  const startEdit = (movie) => {
    setEditingId(movie.id);
    setForm({
      groupTitle: movie.groupTitle || "",
      partTitle: movie.partTitle || "",
      partNumber: movie.partNumber ? String(movie.partNumber) : "",
      description: movie.description || "",
    });
    setPoster(null);
    setVideo(null);
    setMessage("Editing selected movie ✏️");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this movie?");
    if (!confirmed) return;

    try {
      await API.delete(`/movies/${id}`);
      if (editingId === id) {
        resetForm();
      }
      setMessage("Movie deleted successfully ✅");
      loadMovies();
    } catch (err) {
      console.error(err);
      setMessage("Delete failed ❌");
    }
  };

  const groupedSummary = useMemo(() => {
    return movies.reduce((count, movie) => {
      const key = movie.groupTitle || "Untitled";
      count[key] = (count[key] || 0) + 1;
      return count;
    }, {});
  }, [movies]);

  return (
    <div className="page admin-page-bg">
      <Header userName={userName} />

      <div className="admin-layout admin-layout-stacked">
        <div className="admin-form-card">
          <div className="section-badge">Admin Panel</div>
          <h2 className="section-title">
            {editingId ? "Edit Movie" : "Upload Movie Part"}
          </h2>
          <p className="section-subtitle">
            Group all parts under one title and upload them neatly.
          </p>

          {message && <div className="login-message">{message}</div>}

          <form className="admin-form" onSubmit={handleUpload}>
            <div className="admin-field">
              <label>Group Title</label>
              <input
                className="input-modern"
                type="text"
                placeholder="Example: Stranger Things"
                value={form.groupTitle}
                onChange={(e) => handleChange("groupTitle", e.target.value)}
              />
            </div>

            <div className="admin-split-grid">
              <div className="admin-field">
                <label>Part Title</label>
                <input
                  className="input-modern"
                  type="text"
                  placeholder="Optional"
                  value={form.partTitle}
                  onChange={(e) => handleChange("partTitle", e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Part Number</label>
                <input
                  className="input-modern"
                  type="number"
                  placeholder="Optional"
                  value={form.partNumber}
                  onChange={(e) => handleChange("partNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Description</label>
              <textarea
                className="input-modern admin-textarea"
                placeholder="Enter description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
              />
            </div>

            <div className="admin-upload-grid">
              <div className="upload-box">
                <label className="upload-label">
                  Poster Image {editingId ? "(optional while editing)" : ""}
                </label>
                <input
                  id="posterInput"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPoster(e.target.files?.[0] || null)}
                />
              </div>

              <div className="upload-box">
                <label className="upload-label">
                  Movie Video {editingId ? "(optional while editing)" : ""}
                </label>
                <input
                  id="videoInput"
                  className="file-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div className="admin-action-row">
              <button className="btn-primary admin-submit-btn" type="submit">
                {editingId ? "Update Movie" : "Upload Part"}
              </button>

              {editingId && (
                <button
                  className="btn-secondary admin-submit-btn"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-list-card">
          <div className="section-badge">Uploaded Content</div>
          <h2 className="section-title">Uploaded Movies</h2>
          <p className="section-subtitle">
            Total groups: {Object.keys(groupedSummary).length} | Total uploads: {movies.length}
          </p>

          <div className="admin-movie-list admin-movie-list-stacked">
            {movies.length === 0 ? (
              <div className="empty-state">No movie parts uploaded yet.</div>
            ) : (
              movies.map((movie) => (
                <div className="admin-movie-item admin-movie-item-stacked" key={movie.id}>
                  <div className="admin-movie-left">
                    <img
                      src={buildMediaUrl(movie.posterUrl)}
                      alt={movie.groupTitle}
                      className="admin-movie-poster"
                    />
                  </div>

                  <div className="admin-movie-info">
                    <h3>{movie.groupTitle}</h3>
                    {movie.partTitle && <p><strong>Part:</strong> {movie.partTitle}</p>}
                    {movie.partNumber ? (
                      <p><strong>Part Number:</strong> {movie.partNumber}</p>
                    ) : null}
                    <p>{movie.description}</p>

                    <div className="admin-item-actions">
                      <button
                        className="btn-secondary admin-item-btn"
                        type="button"
                        onClick={() => startEdit(movie)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-primary admin-item-btn"
                        type="button"
                        onClick={() => handleDelete(movie.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}