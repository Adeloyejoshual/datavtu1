import { Bell, Search } from "lucide-react";
import useAuthStore from "../../store/useAuthStore.js";
import useWalletStore from "../../store/useWalletStore.js";
import { formatCurrency } from "../../utils/format.js";

export default function Header() {
  const { user } = useAuthStore();
  const { balance } = useWalletStore();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Greeting */}
        <div>
          <p className="text-sm text-gray-500">{getGreeting()},</p>
          <h2 className="text-lg font-bold text-gray-900">
            {user?.first_name} 👋
          </h2>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Balance pill */}
          <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl">
            <span className="text-blue-600 text-xs font-medium">Balance</span>
            <span className="text-blue-800 text-sm font-bold">
              {formatCurrency(balance)}
            </span>
          </div>

          {/* Notifications */}
          <button className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
            <Bell size={18} className="text-gray-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}