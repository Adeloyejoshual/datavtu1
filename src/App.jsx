import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/useAuthStore.js";

// Layouts
import DashboardLayout from "./components/layout/DashboardLayout.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";

// Auth
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

// User Pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Data from "./pages/services/Data.jsx";
import Airtime from "./pages/services/Airtime.jsx";
import Electricity from "./pages/services/Electricity.jsx";
import Cable from "./pages/services/Cable.jsx";
import Betting from "./pages/services/Betting.jsx";
import Transactions from "./pages/wallet/Transactions.jsx";
import Referral from "./pages/referral/Referral.jsx";
import Profile from "./pages/profile/Profile.jsx";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTransactions from "./pages/admin/AdminTransactions.jsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";

// =====================
// Route Guards
// =====================
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();

  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

// =====================
// Layout Wrappers
// =====================
function UserPage({ component: Component }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Component />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AdminPage({ component: Component }) {
  return (
    <AdminRoute>
      <AdminLayout>
        <Component />
      </AdminLayout>
    </AdminRoute>
  );
}

// =====================
// App
// =====================
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
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          },

          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },

          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Routes>
        {/* ───────────────── Public ───────────────── */}

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

        {/* ───────────────── User ───────────────── */}

        <Route
          path="/"
          element={<UserPage component={Dashboard} />}
        />

        <Route
          path="/data"
          element={<UserPage component={Data} />}
        />

        <Route
          path="/airtime"
          element={<UserPage component={Airtime} />}
        />

        <Route
          path="/electricity"
          element={<UserPage component={Electricity} />}
        />

        <Route
          path="/cable"
          element={<UserPage component={Cable} />}
        />

        <Route
          path="/betting"
          element={<UserPage component={Betting} />}
        />

        <Route
          path="/transactions"
          element={<UserPage component={Transactions} />}
        />

        <Route
          path="/referrals"
          element={<UserPage component={Referral} />}
        />

        <Route
          path="/profile"
          element={<UserPage component={Profile} />}
        />

        {/* ───────────────── Admin ───────────────── */}

        <Route
          path="/admin"
          element={<AdminPage component={AdminDashboard} />}
        />

        <Route
          path="/admin/users"
          element={<AdminPage component={AdminUsers} />}
        />

        <Route
          path="/admin/transactions"
          element={<AdminPage component={AdminTransactions} />}
        />

        <Route
          path="/admin/analytics"
          element={<AdminPage component={AdminAnalytics} />}
        />

        <Route
          path="/admin/settings"
          element={<AdminPage component={AdminSettings} />}
        />

        {/* ───────────────── Catch All ───────────────── */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}