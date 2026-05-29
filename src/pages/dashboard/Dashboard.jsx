import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import useAuthStore from "../../store/useAuthStore.js";
import WalletCard from "../../components/shared/WalletCard.jsx";
import ServiceCard from "../../components/shared/ServiceCard.jsx";
import TransactionItem from "../../components/shared/TransactionItem.jsx";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/shared/EmptyState.jsx";
import { SERVICES } from "../../utils/constants.js";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance, setBalance } = useWalletStore();

  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [fundModal, setFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundLoading, setFundLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions({ limit: 5 }),
      ]);
      setBalance(balanceRes.data.balance);
      setTransactions(txRes.data || []);
    } catch {}
    finally {
      setLoadingTx(false);
    }
  };

  const handleFund = async () => {
    if (!fundAmount || parseFloat(fundAmount) < 100) {
      toast.error("Minimum funding amount is ₦100");
      return;
    }

    setFundLoading(true);
    try {
      const res = await walletApi.fundWallet({ amount: parseFloat(fundAmount) });
      window.open(res.data.authorization_url, "_blank");
      setFundModal(false);
      setFundAmount("");
      toast.success("Payment window opened. Complete payment to fund wallet.");
    } catch {}
    finally {
      setFundLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Wallet Card */}
      <WalletCard balance={balance} onFund={() => setFundModal(true)} />

      {/* Services Grid */}
      <Card>
        <CardHeader title="Quick Services" subtitle="What would you like to do?" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader
          title="Recent Transactions"
          subtitle="Your latest activity"
          action={
            <button
              onClick={() => navigate("/transactions")}
              className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight size={14} />
            </button>
          }
        />

        {loadingTx ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="📭"
            title="No transactions yet"
            subtitle="Your transaction history will appear here"
          />
        ) : (
          <div>
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </Card>

      {/* Fund Wallet Modal */}
      <Modal
        isOpen={fundModal}
        onClose={() => setFundModal(false)}
        title="Fund Wallet"
      >
        <div className="space-y-5">
          <Input
            label="Amount (₦)"
            type="number"
            placeholder="Enter amount"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            prefix="₦"
            helper="Minimum: ₦100 · Maximum: ₦1,000,000"
          />

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick select</p>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setFundAmount(String(amt))}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all
                    ${fundAmount === String(amt)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                    }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <Button fullWidth size="lg" loading={fundLoading} onClick={handleFund}>
            Continue to Payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}