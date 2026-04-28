import { useEffect, useMemo, useState } from "react";
import { API, buildMediaUrl } from "../api";
import Header from "../components/Header";

const initialForm = {
  groupTitle: "",
  partTitle: "",
  partNumber: "",
  description: "",
};

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function AdminPage() {
  const [form, setForm] = useState(initialForm);
  const [poster, setPoster] = useState(null);
  const [video, setVideo] = useState(null);
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const userName = localStorage.getItem("userName") || "Guest";

  const loadMovies = async () => {
    setLoadingMovies(true);
    try {
      const res = await API.get("/movies");
      setMovies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setMessage("Unable to load movies ❌");
    } finally {
      setLoadingMovies(false);
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
    setUploadProgress(0);

    const posterInput = document.getElementById("posterInput");
    const videoInput = document.getElementById("videoInput");

    if (posterInput) posterInput.value = "";
    if (videoInput) videoInput.value = "";
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

 const uploadFileToCloudinary = async (file, progressStart, progressEnd) => {
  if (!file) return "";

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Cloudinary environment variables are missing");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "movies");

 const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const percent = Math.round((event.loaded * 100) / event.total);
      const mapped = Math.round(
        progressStart + ((progressEnd - progressStart) * percent) / 100
      );

      setUploadProgress(mapped);
    };

    xhr.onload = () => {
      let response = {};

      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Invalid Cloudinary response"));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300 && response.secure_url) {
        setUploadProgress(progressEnd);
        resolve(response.secure_url);
      } else {
        reject(new Error(response.error?.message || "Cloudinary upload failed"));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Cloudinary upload failed. Disable adblock/VPN or try another browser."));
    };

    xhr.send(formData);
  });
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

    setSubmitting(true);
    setMessage("");
    setUploadProgress(0);

    try {
      let posterUrl = "";
      let videoUrl = "";

      if (poster) {
        posterUrl = await uploadFileToCloudinary(poster, "image", 0, 30);
      }

      if (video) {
        videoUrl = await uploadFileToCloudinary(video, "video", poster ? 30 : 0, 90);
      }

      const payload = {
        groupTitle: form.groupTitle.trim(),
        partTitle: form.partTitle.trim(),
        partNumber: form.partNumber.trim(),
        description: form.description.trim(),
        posterUrl,
        videoUrl,
      };

      if (editingId) {
        await API.put(`/movies/${editingId}/save`, payload);
        setMessage("Movie updated successfully ✅");
      } else {
        await API.post("/admin/save-movie", payload);
        setMessage("Movie saved successfully ✅");
      }

      setUploadProgress(100);
      resetForm();
      await loadMovies();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Upload failed ❌";
      setMessage(errorMessage);
    } finally {
      setSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
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

    setDeletingId(id);
    setMessage("");

    try {
      await API.delete(`/movies/${id}`);
      if (editingId === id) {
        resetForm();
      }
      setMovies((prev) => prev.filter((movie) => movie.id !== id));
      setMessage("Movie deleted successfully ✅");
    } catch (err) {
      console.error(err);
      setMessage("Delete failed ❌");
    } finally {
      setDeletingId("");
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

          {submitting && (
            <div className="upload-progress-wrap">
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="upload-progress-text">
                {uploadProgress}% uploading...
              </div>
            </div>
          )}

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
              <button
                className="btn-primary admin-submit-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? editingId
                    ? "Updating..."
                    : "Uploading..."
                  : editingId
                    ? "Update Movie"
                    : "Save Movie"}
              </button>

              {editingId && (
                <button
                  className="btn-secondary admin-submit-btn"
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
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
            {loadingMovies ? (
              <div className="empty-state">Loading movies...</div>
            ) : movies.length === 0 ? (
              <div className="empty-state">No movie parts uploaded yet.</div>
            ) : (
              movies.map((movie) => (
                <div className="admin-movie-item admin-movie-item-stacked" key={movie.id}>
                  <div className="admin-movie-left">
                    <img
                      src={buildMediaUrl(movie.posterUrl)}
                      alt={movie.groupTitle || "Movie Poster"}
                      className="admin-movie-poster"
                    />
                  </div>

                  <div className="admin-movie-info">
                    <h3>{movie.groupTitle}</h3>
                    {movie.partTitle ? (
                      <p><strong>Part:</strong> {movie.partTitle}</p>
                    ) : null}
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
                        disabled={deletingId === movie.id}
                      >
                        {deletingId === movie.id ? "Deleting..." : "Delete"}
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