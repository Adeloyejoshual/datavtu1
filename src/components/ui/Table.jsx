export default function Table({ headers, children, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((header, i) => (
              <th
                key={i}
                className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>

      {empty && (
        <div className="py-12 text-center text-gray-500 text-sm">{empty}</div>
      )}
    </div>
  );
}

export function TableRow({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer last:border-0"
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "" }) {
  return (
    <td className={`py-3.5 px-4 text-gray-700 ${className}`}>{children}</td>
  );
}