import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API, getMediaUrl } from "../api";
import Header from "../components/Header";

export default function MovieDetailsPage() {
  const { groupTitle } = useParams();
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "Guest";

  useEffect(() => {
    API.get(`/movies/${groupTitle}/parts`)
      .then((res) => {
        setParts(res.data);
        if (res.data.length > 0) {
          setSelectedPart(res.data[0]);
        }
      })
      .catch(console.error);
  }, [groupTitle]);

  const createRoom = async () => {
    if (!selectedPart) return;

    try {
      const res = await API.post("/rooms/create", {
        movieId: selectedPart.id,
        userName,
      });
      navigate(`/room/${res.data.roomCode}`);
    } catch (err) {
      console.error(err);
      alert("Room creation failed");
    }
  };

  return (
    <div className="page">
      <Header userName={userName} />

      {selectedPart && (
        <div className="movie-detail-layout">
          <div className="movie-detail-left">
            <img
              className="movie-detail-poster"
              src={getMediaUrl(selectedPart.posterUrl)}
              alt={selectedPart.groupTitle}
            />
          </div>

          <div className="movie-detail-right">
            <h1>{selectedPart.groupTitle}</h1>
            <p>{selectedPart.description}</p>

            <div className="part-list">
              {parts.map((part) => (
                <button
                  key={part.id}
                  className={`part-btn ${selectedPart?.id === part.id ? "active-part" : ""}`}
                  onClick={() => setSelectedPart(part)}
                >
                  {part.partTitle}
                </button>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn-primary" onClick={createRoom}>
                Create Room
              </button>

              {selectedPart && (
                <a
                  href={getMediaUrl(selectedPart.videoUrl)}
                  download
                >
                  <button className="btn-secondary">
                    Download Selected Part
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}