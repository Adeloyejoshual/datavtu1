import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wifi,
  Phone,
  Zap,
  Tv,
  Target,
  Wallet,
  ArrowLeftRight,
  Users,
  User,
  LogOut,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../store/useAuthStore.js";
import { getInitials } from "../../utils/format.js";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Wallet", icon: Wallet, path: "/wallet" },
  { label: "Transactions", icon: ArrowLeftRight, path: "/transactions" },
  { type: "divider", label: "Services" },
  { label: "Data", icon: Wifi, path: "/data" },
  { label: "Airtime", icon: Phone, path: "/airtime" },
  { label: "Electricity", icon: Zap, path: "/electricity" },
  { label: "Cable TV", icon: Tv, path: "/cable" },
  { label: "Betting", icon: Target, path: "/betting" },
  { type: "divider", label: "Account" },
  { label: "Referrals", icon: Users, path: "/referrals" },
  { label: "Profile", icon: User, path: "/profile" },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">VT</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">VTU Platform</h1>
            <p className="text-xs text-gray-500">Digital Services</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-0.5">
        {navItems.map((item, index) => {
          if (item.type === "divider") {
            return (
              <p
                key={index}
                className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 mt-2"
              >
                {item.label}
              </p>
            );
          }

          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={isActive ? "text-blue-600" : "text-gray-400"}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-blue-600" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-blue-700 font-bold text-sm">
              {getInitials(user?.first_name, user?.last_name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"
            title="Logout"
          >
            <LogOut size={16} className="text-gray-400 group-hover:text-red-500" />
          </button>
        </div>
      </div>
    </aside>
  );
}