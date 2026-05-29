import clsx from "clsx";
import Spinner from "./Spinner.jsx";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = "button",
  className = "",
}) {
  const base =
    "font-semibold rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost: "hover:bg-gray-100 text-gray-600",
    success: "bg-green-500 hover:bg-green-600 text-white",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? <Spinner size="sm" color="white" /> : children}
    </button>
  );
}