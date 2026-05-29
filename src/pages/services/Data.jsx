import { useState, useEffect } from "react";
import { servicesApi } from "../../api/services.api.js";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { NETWORKS } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/format.js";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function Data() {
  const { balance, updateBalance } = useWalletStore();
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [result, setResult] = useState(null);

  const fetchPlans = async (network) => {
    setLoadingPlans(true);
    setPlans([]);
    setSelectedPlan(null);
    try {
      const res = await servicesApi.getDataPlans(network);
      setPlans(res.data.plans || []);
    } catch {
      toast.error("Failed to load data plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleNetworkSelect = (network) => {
    setSelectedNetwork(network);
    fetchPlans(network.id);
  };

  const handleBuy = async () => {
    if (!selectedPlan || !phone || !selectedNetwork) return;

    setLoading(true);
    try {
      const res = await servicesApi.buyData({
        network: selectedNetwork.id,
        phone,
        plan_code: selectedPlan.code,
        amount: selectedPlan.amount,
      });

      setResult(res.data);
      setConfirmModal(false);
      setSuccessModal(true);

      // Refresh balance
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
    setPlans([]);
    setSelectedPlan(null);
    setSuccessModal(false);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Buy Data</h1>
        <p className="text-gray-500 mt-1">Purchase data for any network</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Network Selection */}
          <div>
            <p className="label">Select Network</p>
            <div className="grid grid-cols-4 gap-3">
              {NETWORKS.map((net) => (
                <button
                  key={net.id}
                  onClick={() => handleNetworkSelect(net)}
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

          {/* Phone Number */}
          <Input
            label="Phone Number"
            type="tel"
            placeholder="08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {/* Data Plans */}
          {selectedNetwork && (
            <div>
              <p className="label">Select Data Plan</p>

              {loadingPlans ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {plans.map((plan) => (
                    <button
                      key={plan.code}
                      onClick={() => setSelectedPlan(plan)}
                      className={clsx(
                        "p-4 rounded-2xl border-2 text-left transition-all",
                        selectedPlan?.code === plan.code
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <p className="text-sm font-bold text-gray-800">
                        {plan.name}
                      </p>
                      <p className="text-blue-600 font-bold text-base mt-1">
                        {formatCurrency(plan.amount)}
                      </p>
                      {plan.validity && (
                        <Badge variant="info" size="sm" className="mt-2">
                          {plan.validity}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Balance */}
          <div className="flex items-center justify-between text-sm bg-gray-50 px-4 py-3 rounded-xl">
            <span className="text-gray-500">Wallet Balance</span>
            <span className="font-bold text-gray-800">{formatCurrency(balance)}</span>
          </div>

          <Button
            fullWidth
            size="lg"
            disabled={!selectedNetwork || !selectedPlan || !phone}
            onClick={() => setConfirmModal(true)}
          >
            Buy Data
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
              { label: "Plan", value: selectedPlan?.name },
              { label: "Amount", value: formatCurrency(selectedPlan?.amount) },
              {
                label: "Balance after",
                value: formatCurrency(balance - (selectedPlan?.amount || 0)),
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
      <Modal isOpen={successModal} onClose={reset} title="Purchase Successful">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">✅</span>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">Data Sent!</p>
            <p className="text-gray-500 text-sm mt-1">
              {selectedPlan?.name} sent to {phone}
            </p>
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