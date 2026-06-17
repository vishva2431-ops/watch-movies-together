import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import RoomPage from "./pages/RoomPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import CategoryPage from "./pages/CategoryPage";
import ShortsFeedPage from "./pages/ShortsFeedPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/movies" element={<CategoryPage category="MOVIE" />} />
      <Route path="/music" element={<CategoryPage category="MUSIC" />} />
      <Route path="/shorts" element={<ShortsFeedPage />} />
      <Route path="/shorts-old" element={<CategoryPage category="SHORT" />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/users" element={<UsersPage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
      <Route path="/movie/:groupTitle" element={<MovieDetailsPage />} />
    </Routes>
  );
}