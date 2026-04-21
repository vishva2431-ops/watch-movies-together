import axios from "axios";

const isLocalHost =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isLocalHost
    ? "http://localhost:8080"
    : "https://watchparty-springboot.onrender.com");

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const buildMediaUrl = (path) => {
  if (!path) return "";

  // already full URL (Cloudinary, external)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // avoid double slash
  if (path.startsWith("/")) {
    return `${API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/${path}`;
};