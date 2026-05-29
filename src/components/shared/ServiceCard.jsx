import { useNavigate } from "react-router-dom";
import clsx from "clsx";

export default function ServiceCard({ service }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(service.path)}
      className="flex flex-col items-center gap-3 p-4 bg-white hover:bg-gray-50
                 rounded-2xl border border-gray-100 shadow-sm transition-all
                 active:scale-95 group"
    >
      <div
        className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl",
          "group-hover:scale-110 transition-transform",
          service.color
        )}
      >
        {service.icon}
      </div>
      <span className="text-sm font-semibold text-gray-700">{service.name}</span>
    </button>
  );
}