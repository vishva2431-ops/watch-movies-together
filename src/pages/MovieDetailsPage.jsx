import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API, getMoviePoster } from "../api";
import Header from "../components/Header";

export default function MovieDetailsPage() {
  const { groupTitle } = useParams();
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem("userName") || "Guest";

  useEffect(() => {
    API.get(`/movies/${groupTitle}/parts`).then((res) => {
      setParts(res.data);
      setSelectedPart(res.data[0]);
    });
  }, [groupTitle]);

  const createRoom = async () => {
    const res = await API.post("/rooms/create", {
      movieId: selectedPart.id,
      userName,
    });

    navigate(`/room/${res.data.roomCode}`);
  };

  return (
    <div className="page">
      <Header userName={userName} />

      {selectedPart && (
        <div className="movie-details-card">
          <img src={getMoviePoster(selectedPart)} alt={selectedPart.groupTitle} />

          <div>
            <h1>{selectedPart.groupTitle}</h1>
            <p>{selectedPart.description}</p>

            <select
              className="input-modern"
              value={selectedPart.id}
              onChange={(e) =>
                setSelectedPart(parts.find((p) => p.id === e.target.value))
              }
            >
              {parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.partTitle}
                </option>
              ))}
            </select>

            <button className="btn-primary" onClick={createRoom}>
              Create Watch Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}