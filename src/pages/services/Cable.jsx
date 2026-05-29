import { useState } from "react";
import { servicesApi } from "../../api/services.api.js";
import { walletApi } from "../../api/wallet.api.js";
import useWalletStore from "../../store/useWalletStore.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { CABLE_PROVIDERS } from "../../utils/constants.js";
import { formatCurrency } from "../../utils/format.js";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function Cable() {
  const { balance, updateBalance } = useWalletStore();
  const [provider, setProvider] = useState(null);
  const [smartCard, setSmartCard] = useState("");
  const [customer, setCustomer] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [result, setResult] = useState(null);

  const handleProviderSelect = async (prov) => {
    setProvider(prov);
    setCustomer(null);
    setSmartCard("");
    setSelectedPackage(null);
    setLoadingPackages(true);

    try {
      const res = await servicesApi.getCablePackages(prov.id);
      setPackages(res.data.packages || []);
    } catch {
      toast.error("Failed to load packages");
    } finally {
      setLoadingPackages(false);
    }
  };

  const handleVerify = async () => {
    if (!provider || !smartCard) return;
    setVerifying(true);
    try {
      const res = await servicesApi.verifySmartCard({
        provider: provider.id,
        smart_card_number: smartCard,
      });
      setCustomer(res.data);
      toast.success("Smart card verified");
    } catch {
      setCustomer(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await servicesApi.buyCable({
        provider: provider.id,
        smart_card_number: smartCard,
        package_code: selectedPackage.code,
        amount: selectedPackage.amount,
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
    setProvider(null);
    setSmartCard("");
    setCustomer(null);
    setPackages([]);
    setSelectedPackage(null);
    setSuccessModal(false);
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Cable TV</h1>
        <p className="text-gray-500 mt-1">Subscribe to DSTV, GOTV, StarTimes</p>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Provider */}
          <div>
            <p className="label">Select Provider</p>
            <div className="grid grid-cols-3 gap-3">
              {CABLE_PROVIDERS.map((prov) => (
                <button
                  key={prov.id}
                  onClick={() => handleProviderSelect(prov)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                    provider?.id === prov.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div
                    className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                      prov.color
                    )}
                  >
                    {prov.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {prov.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Smart Card */}
          <div>
            <Input
              label="Smart Card / IUC Number"
              placeholder="Enter smart card number"
              value={smartCard}
              onChange={(e) => {
                setSmartCard(e.target.value);
                setCustomer(null);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              loading={verifying}
              disabled={!provider || !smartCard}
              onClick={handleVerify}
            >
              Verify Card
            </Button>
          </div>

          {/* Customer Info */}
          {customer && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">
                ✅ Smart card verified
              </p>
              <p className="font-semibold text-gray-800">
                {customer.customer_name}
              </p>
              {customer.current_package && (
                <p className="text-sm text-gray-500">
                  Current: {customer.current_package}
                </p>
              )}
              {customer.due_date && (
                <p className="text-sm text-gray-500">
                  Due: {customer.due_date}
                </p>
              )}
            </div>
          )}

          {/* Packages */}
          {provider && (
            <div>
              <p className="label">Select Package</p>
              {loadingPackages ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.code}
                      onClick={() => setSelectedPackage(pkg)}
                      className={clsx(
                        "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                        selectedPackage?.code === pkg.code
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <span className="text-sm font-semibold text-gray-800">
                        {pkg.name}
                      </span>
                      <span className="text-blue-600 font-bold text-sm">
                        {formatCurrency(pkg.amount)}
                      </span>
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
            disabled={!customer || !selectedPackage}
            onClick={() => setConfirmModal(true)}
          >
            Subscribe
          </Button>
        </div>
      </Card>

      {/* Confirm */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Subscription"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            {[
              { label: "Provider", value: provider?.name },
              { label: "Customer", value: customer?.customer_name },
              { label: "Package", value: selectedPackage?.name },
              { label: "Amount", value: formatCurrency(selectedPackage?.amount) },
              {
                label: "Balance after",
                value: formatCurrency(balance - (selectedPackage?.amount || 0)),
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
            <Button fullWidth loading={loading} onClick={handleBuy}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success */}
      <Modal isOpen={successModal} onClose={reset} title="Subscription Activated">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">📺</span>
          </div>
          <p className="font-bold text-gray-800 text-lg">Subscription successful!</p>

          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Package</span>
              <span className="font-semibold">{selectedPackage?.name}</span>
            </div>
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