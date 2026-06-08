import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const extractYouTubeId = (value) => {
  if (!value) return "";

  const text = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(text)) return text;

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1];
  }

  return text;
};

export const getYouTubeWatchUrl = (movie) => {
  const id = extractYouTubeId(movie?.videoUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : "#";
};

export const getYouTubeEmbedUrl = (movie) => {
  const id = extractYouTubeId(movie?.videoUrl);
  return id ? `https://www.youtube.com/embed/${id}` : "";
};

export const getMoviePoster = (movie) => {
  if (!movie) return "https://placehold.co/400x600?text=No+Poster";

  const poster = movie.posterUrl || movie.poster || movie.posterPath || "";

  if (poster) {
    if (poster.startsWith("http")) return poster;
    return `${API_BASE_URL}${poster}`;
  }

  const id = extractYouTubeId(movie.videoUrl);

  if (id) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  return "https://placehold.co/400x600?text=No+Poster";
};

export const getMoviePreview = (movie) => {
  return getYouTubeWatchUrl(movie);
};

export const getMovieVideo = (movie) => {
  return extractYouTubeId(movie?.videoUrl);
};

export default API;