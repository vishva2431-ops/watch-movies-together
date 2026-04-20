import { useEffect, useState } from "react";
import { API, getMediaUrl } from "../api";
import Header from "../components/Header";

export default function AdminPage() {
  const [groupTitle, setGroupTitle] = useState("");
  const [partTitle, setPartTitle] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [poster, setPoster] = useState(null);
  const [video, setVideo] = useState(null);
  const [movies, setMovies] = useState([]);
  const [message, setMessage] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploading, setUploading] = useState(false);

  const userName = localStorage.getItem("userName") || "Guest";

  const loadMovies = async () => {
    try {
      const res = await API.get("/movies");
      setMovies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!groupTitle.trim() || !poster || !video) {
      setMessage("Movie name, poster image, and movie video are required");
      return;
    }

    try {
      setUploading(true);
      setUploadPercent(0);
      setMessage("Uploading...");

      const formData = new FormData();
      formData.append("groupTitle", groupTitle.trim());
      formData.append("partTitle", partTitle.trim() || groupTitle.trim());
      formData.append("partNumber", partNumber || "1");
      formData.append("description", description.trim() || "");
      formData.append("poster", poster);
      formData.append("video", video);

      await API.post("/admin/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);

            if (percent === 100) {
              setMessage("Upload finished from browser. Waiting for server...");
            }
          }
        },
      });

      await loadMovies();

      setMessage("Movie part uploaded successfully ✅");
      setGroupTitle("");
      setPartTitle("");
      setPartNumber("");
      setDescription("");
      setPoster(null);
      setVideo(null);
      setUploadPercent(100);

      const posterInput = document.getElementById("posterInput");
      const videoInput = document.getElementById("videoInput");
      if (posterInput) posterInput.value = "";
      if (videoInput) videoInput.value = "";
    } catch (err) {
      console.error(err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.details ||
        "Upload failed ❌";
      setMessage(String(errorMessage));
      setUploadPercent(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page admin-page-bg">
      <Header userName={userName} />

      <div className="admin-layout">
        <div className="admin-form-card">
          <div className="section-badge">Admin Panel</div>
          <h2 className="section-title">Upload Movie Part</h2>
          <p className="section-subtitle">
            Group all parts under one title and upload them neatly.
          </p>

          {message && <div className="login-message">{message}</div>}

          <form className="admin-form" onSubmit={handleUpload}>
            <div className="admin-field">
              <label>Group Title *</label>
              <input
                className="input-modern"
                type="text"
                placeholder="Example: Stranger Things"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>

            <div className="admin-split-grid">
              <div className="admin-field">
                <label>Part Title</label>
                <input
                  className="input-modern"
                  type="text"
                  placeholder="Optional"
                  value={partTitle}
                  onChange={(e) => setPartTitle(e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Part Number</label>
                <input
                  className="input-modern"
                  type="number"
                  placeholder="Optional"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-field">
              <label>Description</label>
              <textarea
                className="input-modern admin-textarea"
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="admin-upload-grid">
              <div className="upload-box">
                <label className="upload-label">Poster Image *</label>
                <input
                  id="posterInput"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPoster(e.target.files[0])}
                />
              </div>

              <div className="upload-box">
                <label className="upload-label">Movie Video *</label>
                <input
                  id="videoInput"
                  className="file-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideo(e.target.files[0])}
                />
              </div>
            </div>

            {(uploading || uploadPercent > 0) && (
              <div className="upload-progress-section">
                <div className="upload-progress-top">
                  <span>{uploading ? "Uploading file..." : "Upload completed"}</span>
                  <span>{uploadPercent}%</span>
                </div>
                <div className="upload-progress-bar">
                  <div
                    className="upload-progress-fill"
                    style={{ width: `${uploadPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            <button className="btn-primary admin-submit-btn" type="submit" disabled={uploading}>
              {uploading ? `Uploading ${uploadPercent}%` : "Upload Part"}
            </button>
          </form>
        </div>

        <div className="admin-list-card">
          <div className="section-badge">Uploaded Content</div>
          <h2 className="section-title">Movie Groups</h2>
          <p className="section-subtitle">
            Check what has already been uploaded.
          </p>

          <div className="admin-movie-list">
            {movies.length === 0 ? (
              <div className="empty-state">No movie parts uploaded yet.</div>
            ) : (
              movies.map((movie) => (
                <div className="admin-movie-item" key={movie.id}>
                  <div className="admin-movie-left">
                    <img
                      src={getMediaUrl(movie.posterUrl)}
                      alt={movie.groupTitle}
                      className="admin-movie-poster"
                    />
                  </div>

                  <div className="admin-movie-info">
                    <h3>{movie.groupTitle}</h3>
                    <p><strong>Part:</strong> {movie.partTitle}</p>
                    <p><strong>Part Number:</strong> {movie.partNumber}</p>
                    <p>{movie.description}</p>
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