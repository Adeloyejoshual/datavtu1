import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  BarChart2,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../store/useAuthStore.js";
import { getInitials } from "../../utils/format.js";

const adminNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/admin/transactions" },
  { label: "Analytics", icon: BarChart2, path: "/admin/analytics" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

function AdminSidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-500">VTU Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {adminNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                     text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          <ChevronRight size={18} className="rotate-180" />
          Back to App
        </button>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-blue-300 font-bold text-xs">
              {getInitials(user?.first_name, user?.last_name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={14} className="text-gray-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}