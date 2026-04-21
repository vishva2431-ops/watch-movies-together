import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import RoomPage from "./pages/RoomPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/users" element={<UsersPage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
      <Route path="/movie/:groupTitle" element={<MovieDetailsPage />} />
    </Routes>
  );
}