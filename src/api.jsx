import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const getDrivePreviewUrl = (fileId) =>
  fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "";

export const getDriveDownloadUrl = (fileId) =>
  fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : "";

export const getDrivePosterUrl = (fileId) =>
  fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w800` : "";

export const getMoviePoster = (movie) =>
  movie?.posterUrl || getDrivePosterUrl(movie?.drivePosterFileId);

export const getMovieVideo = (movie) =>
  getDriveDownloadUrl(movie?.driveVideoFileId);

export const getMoviePreview = (movie) =>
  movie?.videoUrl || getDrivePreviewUrl(movie?.driveVideoFileId);