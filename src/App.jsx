import { Routes, Route, Navigate} from "react-router-dom";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { useNavigate, useLocation } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import RoomPage from "./pages/RoomPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";
import CategoryPage from "./pages/CategoryPage";
import ShortsFeedPage from "./pages/ShortsFeedPage";

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const listener = CapacitorApp.addListener("backButton", () => {
      if (location.pathname !== "/" && location.pathname !== "/home") {
        navigate(-1);
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [location, navigate]);

  return null;
}

function ProtectedRoute({ children }) {
  const userName = localStorage.getItem("userName");

  if (!userName || userName === "undefined" || userName === "null") {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <>
      <BackButtonHandler />

      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/movies" element={<ProtectedRoute><CategoryPage category="MOVIE" /></ProtectedRoute>} />
        <Route path="/music" element={<ProtectedRoute><CategoryPage category="MUSIC" /></ProtectedRoute>} />
        <Route path="/shorts" element={<ProtectedRoute><ShortsFeedPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/room/:roomCode" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
        <Route path="/movie/:groupTitle" element={<ProtectedRoute><MovieDetailsPage /></ProtectedRoute>} />
      </Routes>
    </>
  );
}