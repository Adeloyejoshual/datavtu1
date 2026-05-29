import { Eye, EyeOff, Plus, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "../../utils/format.js";
import { useNavigate } from "react-router-dom";

export default function WalletCard({ balance, onFund }) {
  const [hidden, setHidden] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm font-medium">Total Balance</p>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-bold">
                {hidden ? "₦••••••" : formatCurrency(balance)}
              </h2>
              <button
                onClick={() => setHidden(!hidden)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {hidden ? (
                  <EyeOff size={18} className="text-blue-200" />
                ) : (
                  <Eye size={18} className="text-blue-200" />
                )}
              </button>
            </div>
          </div>

          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
            <span className="text-2xl">💳</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onFund}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20
                       text-white text-sm font-semibold py-2.5 rounded-xl
                       transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Fund Wallet
          </button>

          <button
            onClick={() => navigate("/transactions")}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20
                       text-white text-sm font-semibold py-2.5 rounded-xl
                       transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpDown size={16} />
            History
          </button>
        </div>
      </div>
    </div>
  );
}