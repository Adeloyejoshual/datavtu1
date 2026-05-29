import { formatCurrency, formatDate, getStatusColor } from "../../utils/format.js";
import Badge from "../ui/Badge.jsx";

const SERVICE_LABELS = {
  data_purchase: "Data",
  airtime_purchase: "Airtime",
  electricity_purchase: "Electricity",
  cable_purchase: "Cable TV",
  betting_purchase: "Betting",
  wallet_funding: "Funding",
};

const statusVariant = {
  success: "success",
  failed: "error",
  pending: "warning",
  processing: "info",
};

export default function RecentActivity({ transactions = [] }) {
  return (
    <div className="space-y-0">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {tx.first_name} {tx.last_name}
              </p>
              <Badge
                variant={statusVariant[tx.status] || "default"}
                size="sm"
              >
                {tx.status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {SERVICE_LABELS[tx.type] || tx.type} ·{" "}
              {formatDate(tx.created_at)}
            </p>
            <p className="text-xs text-gray-400 font-mono">{tx.reference}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-800">
              {formatCurrency(tx.amount)}
            </p>
            <p className="text-xs text-gray-400">{tx.user_email}</p>
          </div>
        </div>
      ))}
    </div>
  );
}