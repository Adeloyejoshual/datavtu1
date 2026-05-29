import clsx from "clsx";

export default function Spinner({ size = "md", color = "blue" }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
    xl: "h-12 w-12 border-4",
  };

  const colors = {
    blue: "border-blue-600 border-t-transparent",
    white: "border-white border-t-transparent",
    gray: "border-gray-400 border-t-transparent",
  };

  return (
    <div
      className={clsx(
        "rounded-full animate-spin",
        sizes[size],
        colors[color]
      )}
    />
  );
}