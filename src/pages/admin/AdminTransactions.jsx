import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/admin.api.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Table, { TableRow, TableCell } from "../../components/ui/Table.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";
import { Search } from "lucide-react";
import clsx from "clsx";

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Pending", value: "pending" },
];

const TYPE_FILTERS = [
  { label: "All Types", value: "" },
  { label: "Data", value: "data_purchase" },
  { label: "Airtime", value: "airtime_purchase" },
  { label: "Electricity", value: "electricity_purchase" },
  { label: "Cable TV", value: "cable_purchase" },
  { label: "Betting", value: "betting_purchase" },
  { label: "Funding", value: "wallet_funding" },
];

const STATUS_VARIANT = {
  success: "success",
  failed: "error",
  pending: "warning",
  processing: "info",
  reversed: "default",
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const limit = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTransactions({
        page,
        limit,
        status: status || undefined,
        type: type || undefined,
        search: search || undefined,
      });
      setTransactions(res.data);
      setTotal(res.pagination?.total || 0);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [page, status, type, search]);

  useEffect(() => {
    const timer = setTimeout(fetchTransactions, 300);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-500 mt-1">
          {total.toLocaleString()} total transactions
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
              status === tab.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search reference or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table
            headers={[
              "Reference",
              "User",
              "Type",
              "Amount",
              "Status",
              "Date",
              "",
            ]}
            empty={transactions.length === 0 ? "No transactions found" : null}
          >
            {transactions.map((tx) => (
              <TableRow
                key={tx.id}
                onClick={() => { setSelected(tx); setDetailModal(true); }}
              >
                <TableCell>
                  <span className="font-mono text-xs text-gray-600">
                    {tx.reference}
                  </span>
                </TableCell>

                <TableCell>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {tx.first_name} {tx.last_name}
                    </p>
                    <p className="text-xs text-gray-400">{tx.user_email}</p>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm capitalize text-gray-600">
                    {tx.type.replace(/_/g, " ")}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-sm font-bold text-gray-800">
                    {formatCurrency(tx.amount)}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={STATUS_VARIANT[tx.status] || "default"}
                    size="sm"
                  >
                    {tx.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-gray-500">
                    {formatDate(tx.created_at)}
                  </span>
                </TableCell>

                <TableCell>
                  <button className="text-xs text-blue-600 font-semibold hover:underline">
                    View
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title="Transaction Details"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={STATUS_VARIANT[selected.status] || "default"}
              >
                {selected.status}
              </Badge>
              <span className="text-2xl font-black text-gray-900">
                {formatCurrency(selected.amount)}
              </span>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              {[
                { label: "Reference", value: selected.reference },
                { label: "Type", value: selected.type.replace(/_/g, " ") },
                { label: "User", value: `${selected.first_name} ${selected.last_name}` },
                { label: "Email", value: selected.user_email },
                { label: "Phone", value: selected.phone },
                { label: "Provider", value: selected.provider || "—" },
                {
                  label: "Provider Ref",
                  value: selected.provider_reference || "—",
                },
                {
                  label: "Balance Before",
                  value: formatCurrency(selected.balance_before),
                },
                {
                  label: "Balance After",
                  value: formatCurrency(selected.balance_after),
                },
                { label: "Date", value: formatDate(selected.created_at) },
                {
                  label: "Description",
                  value: selected.description || "—",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between text-sm gap-4"
                >
                  <span className="text-gray-500 flex-shrink-0">{label}</span>
                  <span className="font-semibold text-gray-800 text-right capitalize break-all">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {selected.metadata &&
              Object.keys(selected.metadata).length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Metadata</p>
                  <pre className="bg-gray-50 rounded-xl p-3 text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}