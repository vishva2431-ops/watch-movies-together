import { useNavigate } from "react-router-dom";
import { getMediaUrl } from "../api";

export default function MovieCard({ movie, onCreateRoom }) {
  const navigate = useNavigate();

  return (
    <div className="movie-card hover-card">
      <img
        src={getMediaUrl(movie.posterUrl)}
        alt={movie.groupTitle || movie.title}
        onClick={() => navigate(`/movie/${movie.groupTitle}`)}
      />

      <div className="movie-content">
        <h3>{movie.groupTitle || movie.title}</h3>
        <p>{movie.description}</p>

        <div className="movie-card-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate(`/movie/${movie.groupTitle}`)}
          >
            View Parts
          </button>

          <button
            className="btn-primary"
            onClick={() => onCreateRoom(movie.id)}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}