export default function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon || "📭"}</div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-gray-500 max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}