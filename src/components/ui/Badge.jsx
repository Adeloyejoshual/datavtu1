import clsx from "clsx";

export default function Badge({ children, variant = "default", size = "md" }) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
  };

  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size]
      )}
    >
      {children}
    </span>
  );
}