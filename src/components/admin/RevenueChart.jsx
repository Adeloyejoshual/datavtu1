import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-blue-600">
          ₦{parseFloat(payload[0]?.value || 0).toLocaleString()}
        </p>
        <p className="text-xs text-gray-500">
          {payload[1]?.value} transactions
        </p>
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data = [], period }) {
  const formatted = data.map((d) => ({
    ...d,
    label:
      period === "12months"
        ? format(new Date(d.date), "MMM yy")
        : format(new Date(d.date), "MMM dd"),
    volume: parseFloat(d.volume),
    successful: parseInt(d.successful),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1000000
              ? `₦${(v / 1000000).toFixed(1)}M`
              : v >= 1000
              ? `₦${(v / 1000).toFixed(0)}k`
              : `₦${v}`
          }
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="volume"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#volumeGrad)"
          dot={false}
          activeDot={{ r: 5, fill: "#3b82f6" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}