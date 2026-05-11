import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const getMoviePoster = (movie) => {
  return movie?.posterUrl || "";
};

export const getMovieVideo = (movie) => {
  return movie?.videoUrl || "";
};

export const getMoviePreview = (movie) => {
  return movie?.videoUrl || "";
};