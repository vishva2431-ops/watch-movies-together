import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import UsersPage from "./pages/UsersPage";
import RoomPage from "./pages/RoomPage";
import MovieDetailsPage from "./pages/MovieDetailsPage";

function PrivateRoute({ children }) {
  const userName = localStorage.getItem("userName");
  return userName ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  const currentUser = (localStorage.getItem("userName") || "").trim();
  const currentMobile = (localStorage.getItem("userMobile") || "").trim();

  const isAdminUser =
    currentUser === "Vishva_N" &&
    currentMobile === "9025783849";

  return isAdminUser ? children : <Navigate to="/home" replace />;
}

function PublicRoute({ children }) {
  const userName = localStorage.getItem("userName");
  return userName ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/home"
        element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          </PrivateRoute>
        }
      />

      <Route
        path="/room/:roomCode"
        element={
          <PrivateRoute>
            <RoomPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/movie/:groupTitle"
        element={
          <PrivateRoute>
            <MovieDetailsPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}