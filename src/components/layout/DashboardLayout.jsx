import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";
import MobileNav from "./MobileNav.jsx";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — Desktop only */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}