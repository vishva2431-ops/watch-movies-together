import axios from "axios";

export const API_BASE_URL = "https://watchparty-springboot.onrender.com";

export const API = axios.create({
  baseURL: API_BASE_URL,
});

export const getMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
};

export const getWsUrl = () => `${API_BASE_URL}/ws`;