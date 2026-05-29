import clsx from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  };

  const isPositive = trend === "up";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>

          {trendValue && (
            <div
              className={clsx(
                "flex items-center gap-1 mt-2 text-xs font-semibold",
                isPositive ? "text-green-600" : "text-red-500"
              )}
            >
              {isPositive ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {trendValue}
              <span className="text-gray-400 font-normal">vs last period</span>
            </div>
          )}

          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div
          className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0",
            colors[color]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}