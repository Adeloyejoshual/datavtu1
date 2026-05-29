import { formatCurrency, formatDate, getStatusColor, getTransactionIcon } from "../../utils/format.js";
import Badge from "../ui/Badge.jsx";
import clsx from "clsx";

export default function TransactionItem({ transaction }) {
  const isCredit = [
    "wallet_funding",
    "referral_bonus",
    "commission",
    "reversal",
  ].includes(transaction.type);

  const statusVariantMap = {
    success: "success",
    failed: "error",
    pending: "warning",
    processing: "info",
    reversed: "default",
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0">
      {/* Icon */}
      <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
        {getTransactionIcon(transaction.type)}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          {transaction.description || transaction.type.replace(/_/g, " ")}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-500">
            {formatDate(transaction.created_at)}
          </p>
          <Badge
            variant={statusVariantMap[transaction.status] || "default"}
            size="sm"
          >
            {transaction.status}
          </Badge>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p
          className={clsx(
            "text-sm font-bold",
            isCredit ? "text-green-600" : "text-gray-800"
          )}
        >
          {isCredit ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatCurrency(transaction.balance_after)}
        </p>
      </div>
    </div>
  );
}