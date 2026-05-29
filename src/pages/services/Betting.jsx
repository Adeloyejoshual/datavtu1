import { useState } from "react";
import { servicesApi } from "../../api/services.api.js";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { BETTING_PLATFORMS } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/format.js";
import toast from "react-hot-toast";
import clsx from "clsx";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export default function Betting() {
  const { balance, updateBalance } = useWalletStore();
  const [platform, setPlatform] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [customer, setCustomer] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async () => {
    if (!platform || !customerId) return;
    setVerifying(true);
    try {
      const res = await servicesApi.verifyBettingCustomer({
        platform: platform.id,
        customer_id: customerId,
      });
      setCustomer(res.data);
      toast.success("Account verified");
    } catch {
      setCustomer(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleFund = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.fundBetting({
        platform: platform.id,
        customer_id: customerId,
        amount: parseFloat(amount),
      });
      setResult(res.data);
      setConfirmModal(false);
      setSuccessModal(true);

      const balRes = await walletApi.getBalance();
      updateBalance(balRes.data.balance);
    } catch {
      setConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPlatform(null);
    setCustomerId("");
    setAmount("");
    setCustomer(null);
    setSuccessModal(false);
    setResult(null);
  };

  const canProceed = customer && parseFloat(amount) >= 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Fund Betting Account</h1>
        <p className="text-gray-500 mt-1">Top up any betting platform instantly</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Platform */}
          <div>
            <p className="label">Select Platform</p>
            <div className="grid grid-cols-2 gap-2">
              {BETTING_PLATFORMS.map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => {
                    setPlatform(plat);
                    setCustomer(null);
                    setCustomerId("");
                  }}
                  className={clsx(
                    "flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left",
                    platform?.id === plat.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {plat.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {plat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer ID */}
          <div>
            <Input
              label="Betting Account ID / Username"
              placeholder="Enter your account ID"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setCustomer(null);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              loading={verifying}
              disabled={!platform || !customerId}
              onClick={handleVerify}
            >
              Verify Account
            </Button>
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">
                ✅ Account verified
              </p>
              <p className="font-semibold text-gray-800">
                {customer.customer_name}
              </p>
              <p className="text-sm text-gray-500">{customer.customer_id}</p>
            </div>
          )}

          {/* Amount */}
          <div>
            <p className="label">Amount</p>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(String(amt))}
                  className={clsx(
                    "py-2 rounded-xl text-xs font-semibold border transition-all",
                    amount === String(amt)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600"
                  )}
                >
                  ₦{(amt / 1000).toFixed(amt < 1000 ? 0 : 0)}
                  {amt >= 1000 ? "k" : ""}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Or enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              prefix="₦"
            />
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between text-sm bg-gray-50 px-4 py-3 rounded-xl">
            <span className="text-gray-500">Wallet Balance</span>
            <span className="font-bold text-gray-800">{formatCurrency(balance)}</span>
          </div>

          <Button
            fullWidth
            size="lg"
            disabled={!canProceed}
            onClick={() => setConfirmModal(true)}
          >
            Fund Account
          </Button>
        </div>
      </Card>

      {/* Confirm */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Fund"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            {[
              { label: "Platform", value: platform?.name },
              { label: "Account", value: customer?.customer_name },
              { label: "Amount", value: formatCurrency(parseFloat(amount)) },
              {
                label: "Balance after",
                value: formatCurrency(balance - parseFloat(amount || 0)),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setConfirmModal(false)}>
              Cancel
            </Button>
            <Button fullWidth loading={loading} onClick={handleFund}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success */}
      <Modal isOpen={successModal} onClose={reset} title="Account Funded!">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">🎯</span>
          </div>
          <p className="font-bold text-gray-800 text-lg">
            {formatCurrency(parseFloat(amount))} added to {platform?.name}
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-xs">{result?.reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">New Balance</span>
              <span className="font-bold">{formatCurrency(result?.balance)}</span>
            </div>
          </div>

          <Button fullWidth onClick={reset}>Done</Button>
        </div>
      </Modal>
    </div>
  );
}