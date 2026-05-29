import clsx from "clsx";

export default function Input({
  label,
  error,
  helper,
  prefix,
  suffix,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-3 text-gray-500 text-sm font-medium">
            {prefix}
          </div>
        )}

        <input
          className={clsx(
            "w-full px-4 py-3 rounded-xl border transition-all duration-200",
            "bg-white text-gray-900 placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
            error
              ? "border-red-400 focus:ring-red-400"
              : "border-gray-200",
            prefix && "pl-10",
            suffix && "pr-10",
            className
          )}
          {...props}
        />

        {suffix && (
          <div className="absolute right-3 text-gray-500 text-sm">
            {suffix}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}

      {helper && !error && (
        <p className="mt-1.5 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  );
}