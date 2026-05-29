import { useState, useEffect } from "react";
import { walletApi } from "../../api/wallet.api.js";
import Card from "../../components/ui/Card.jsx";
import TransactionItem from "../../components/shared/TransactionItem.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/shared/EmptyState.jsx";
import Button from "../../components/ui/Button.jsx";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Data", value: "data_purchase" },
  { label: "Airtime", value: "airtime_purchase" },
  { label: "Electricity", value: "electricity_purchase" },
  { label: "Cable", value: "cable_purchase" },
  { label: "Betting", value: "betting_purchase" },
  { label: "Funding", value: "wallet_funding" },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchTransactions();
  }, [filter, page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await walletApi.getTransactions({
        type: filter || undefined,
        page,
        limit,
      });
      setTransactions(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Transactions</h1>
        <p className="text-gray-500 mt-1">{total} total transactions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setPage(1); }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all
              ${filter === f.value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No transactions"
            subtitle="No transactions found for the selected filter"
          />
        ) : (
          <div className="px-6">
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
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
    </div>
  );
}