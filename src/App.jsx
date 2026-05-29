import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/useAuthStore.js";

// Layouts
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Auth pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

// Dashboard
import Dashboard from "./pages/dashboard/Dashboard.jsx";

// Services
import Data from "./pages/services/Data.jsx";
import Airtime from "./pages/services/Airtime.jsx";
import Electricity from "./pages/services/Electricity.jsx";
import Cable from "./pages/services/Cable.jsx";
import Betting from "./pages/services/Betting.jsx";

// Wallet
import Transactions from "./pages/wallet/Transactions.jsx";

// Referral
import Referral from "./pages/referral/Referral.jsx";

// Profile
import Profile from "./pages/profile/Profile.jsx";

// Protected Route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public Route (redirect if logged in)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#fff" },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Data />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/airtime"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Airtime />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/electricity"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Electricity />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cable"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Cable />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/betting"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Betting />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Transactions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/referrals"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Referral />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}