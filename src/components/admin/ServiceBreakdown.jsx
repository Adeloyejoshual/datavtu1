import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/format.js";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

const SERVICE_LABELS = {
  data_purchase: "Data",
  airtime_purchase: "Airtime",
  electricity_purchase: "Electricity",
  cable_purchase: "Cable TV",
  betting_purchase: "Betting",
};

export default function ServiceBreakdown({ data = [] }) {
  const formatted = data.map((d) => ({
    name: SERVICE_LABELS[d.type] || d.type,
    value: parseFloat(d.volume),
    count: parseInt(d.total),
    rate: parseFloat(d.success_rate),
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={formatted}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {formatted.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatCurrency(value), "Volume"]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="mt-4 space-y-2">
        {formatted.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">
                {formatCurrency(item.value)}
              </p>
              <p className="text-xs text-gray-400">
                {item.rate}% success · {item.count} tx
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}