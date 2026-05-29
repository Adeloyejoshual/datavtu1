import { NavLink } from "react-router-dom";
import { LayoutDashboard, Wallet, Wifi, Users, User } from "lucide-react";
import clsx from "clsx";

const mobileNav = [
  { label: "Home", icon: LayoutDashboard, path: "/" },
  { label: "Wallet", icon: Wallet, path: "/wallet" },
  { label: "Data", icon: Wifi, path: "/data" },
  { label: "Referrals", icon: Users, path: "/referrals" },
  { label: "Profile", icon: User, path: "/profile" },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 lg:hidden">
      <div className="flex">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
                  isActive ? "text-blue-600" : "text-gray-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}