import { getMoviePoster } from "../api";

export default function MovieCard({ movie, onCreateRoom }) {
  return (
    <div className="movie-card hover-card">
      <img
        src={getMoviePoster(movie)}
        alt={movie.groupTitle}
        className="movie-poster"
        onClick={() => onCreateRoom(movie.id)}
      />

      <div className="movie-content">
        <h3>{movie.groupTitle}</h3>
        <p>{movie.partTitle}</p>
        <p>{movie.description}</p>

        <div className="movie-card-actions">
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