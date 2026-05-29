import { useState } from "react";
import { servicesApi } from "../../api/services.api.js";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { NETWORKS } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/format.js";
import toast from "react-hot-toast";
import clsx from "clsx";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function Airtime() {
  const { balance, updateBalance } = useWalletStore();
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [result, setResult] = useState(null);
  const [detectingNetwork, setDetectingNetwork] = useState(false);

  const handlePhoneChange = async (e) => {
    const val = e.target.value;
    setPhone(val);

    // Auto-detect network
    if (val.length === 11) {
      setDetectingNetwork(true);
      try {
        const res = await servicesApi.detectNetwork(val);
        const detected = NETWORKS.find(
          (n) => n.id === res.data.network_key
        );
        if (detected) {
          setSelectedNetwork(detected);
          toast.success(`${detected.name} detected`);
        }
      } catch {}
      finally {
        setDetectingNetwork(false);
      }
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.buyAirtime({
        network: selectedNetwork.id,
        phone,
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
    setSelectedNetwork(null);
    setPhone("");
    setAmount("");
    setSuccessModal(false);
    setResult(null);
  };

  const canProceed =
    selectedNetwork && phone.length === 11 && parseFloat(amount) >= 50;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Buy Airtime</h1>
        <p className="text-gray-500 mt-1">Top up any network instantly</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Network */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="label">Select Network</p>
              {detectingNetwork && (
                <span className="text-xs text-blue-600">Detecting...</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {NETWORKS.map((net) => (
                <button
                  key={net.id}
                  onClick={() => setSelectedNetwork(net)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    selectedNetwork?.id === net.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div
                    className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                      net.color,
                      net.textColor
                    )}
                  >
                    {net.name}
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {net.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone */}
          <Input
            label="Phone Number"
            type="tel"
            placeholder="08012345678"
            value={phone}
            onChange={handlePhoneChange}
            helper="Network will be auto-detected"
          />

          {/* Amount */}
          <div>
            <p className="label">Amount</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(String(amt))}
                  className={clsx(
                    "py-2.5 rounded-xl text-sm font-semibold border transition-all",
                    amount === String(amt)
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  ₦{amt.toLocaleString()}
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
            Buy Airtime
          </Button>
        </div>
      </Card>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Purchase"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            {[
              { label: "Network", value: selectedNetwork?.name },
              { label: "Phone", value: phone },
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
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button fullWidth loading={loading} onClick={handleBuy}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModal} onClose={reset} title="Airtime Sent!">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">
              {formatCurrency(parseFloat(amount))} airtime sent!
            </p>
            <p className="text-gray-500 text-sm mt-1">To {phone}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reference</span>
              <span className="font-mono text-xs text-gray-700">
                {result?.reference}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">New Balance</span>
              <span className="font-bold text-gray-800">
                {formatCurrency(result?.balance)}
              </span>
            </div>
          </div>

          <Button fullWidth onClick={reset}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}