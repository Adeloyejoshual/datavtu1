export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function truncate(str, length = 20) {
  if (!str) return "";
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

export function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export function getStatusColor(status) {
  const colors = {
    success: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    reversed: "bg-gray-100 text-gray-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export function getTransactionIcon(type) {
  const icons = {
    wallet_funding: "↓",
    data_purchase: "📶",
    airtime_purchase: "📞",
    electricity_purchase: "⚡",
    cable_purchase: "📺",
    betting_purchase: "🎯",
    transfer: "↔",
    referral_bonus: "🎁",
    commission: "💰",
    reversal: "↩",
  };
  return icons[type] || "💳";
}