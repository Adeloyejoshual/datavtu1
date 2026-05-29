import { useState } from "react";
import { servicesApi } from "../../api/services.api.js";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { ELECTRICITY_PROVIDERS } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/format.js";
import toast from "react-hot-toast";

export default function Electricity() {
  const { balance, updateBalance } = useWalletStore();

  const [form, setForm] = useState({
    service_id: "",
    meter_number: "",
    meter_type: "prepaid",
    amount: "",
  });

  const [customer, setCustomer] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === "meter_number") setCustomer(null);
  };

  const handleVerify = async () => {
    if (!form.service_id || !form.meter_number || !form.amount) {
      toast.error("Please fill all fields first");
      return;
    }

    setVerifying(true);
    try {
      const res = await servicesApi.verifyMeter(form);
      setCustomer(res.data);
      toast.success("Meter verified successfully");
    } catch {
      setCustomer(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.buyElectricity(form);
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
    setForm({ service_id: "", meter_number: "", meter_type: "prepaid", amount: "" });
    setCustomer(null);
    setSuccessModal(false);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Buy Electricity</h1>
        <p className="text-gray-500 mt-1">Purchase power units instantly</p>
      </div>

      <Card>
        <div className="space-y-5">
          {/* Provider */}
          <div>
            <label className="label">Electricity Provider</label>
            <select
              name="service_id"
              value={form.service_id}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Select provider</option>
              {ELECTRICITY_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Meter Type */}
          <div>
            <label className="label">Meter Type</label>
            <div className="flex gap-3">
              {["prepaid", "postpaid"].map((type) => (
                <button
                  key={type}
                  onClick={() => setForm((p) => ({ ...p, meter_type: type }))}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all
                    ${form.meter_type === type
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Meter Number */}
          <Input
            label="Meter Number"
            name="meter_number"
            placeholder="Enter meter number"
            value={form.meter_number}
            onChange={handleChange}
          />

          {/* Amount */}
          <Input
            label="Amount (₦)"
            type="number"
            name="amount"
            placeholder="Minimum ₦1,000"
            value={form.amount}
            onChange={handleChange}
            prefix="₦"
          />

          {/* Customer Info */}
          {customer && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">
                ✅ Meter Verified
              </p>
              <p className="font-semibold text-gray-800">
                {customer.customer_name}
              </p>
              {customer.current_package && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Current: {customer.current_package}
                </p>
              )}
            </div>
          )}

          {/* Balance */}
          <div className="flex items-center justify-between text-sm bg-gray-50 px-4 py-3 rounded-xl">
            <span className="text-gray-500">Wallet Balance</span>
            <span className="font-bold text-gray-800">{formatCurrency(balance)}</span>
          </div>

          <div className="flex gap-3">
            {!customer ? (
              <Button
                fullWidth
                variant="secondary"
                loading={verifying}
                onClick={handleVerify}
              >
                Verify Meter
              </Button>
            ) : (
              <Button
                fullWidth
                size="lg"
                onClick={() => setConfirmModal(true)}
              >
                Buy Electricity
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Confirm */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Purchase"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            {[
              { label: "Customer", value: customer?.customer_name },
              { label: "Meter", value: form.meter_number },
              { label: "Type", value: form.meter_type },
              { label: "Amount", value: formatCurrency(parseFloat(form.amount)) },
              {
                label: "Balance after",
                value: formatCurrency(balance - parseFloat(form.amount || 0)),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800 capitalize">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setConfirmModal(false)}>
              Cancel
            </Button>
            <Button fullWidth loading={loading} onClick={handleBuy}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success */}
      <Modal isOpen={successModal} onClose={reset} title="Purchase Successful">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-4xl">⚡</span>
          </div>

          {result?.token && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-2">Token</p>
              <p className="font-mono text-xl font-bold text-blue-800 tracking-widest">
                {result.token}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {result.units} units
              </p>
            </div>
          )}

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