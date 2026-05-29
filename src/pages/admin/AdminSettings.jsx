import { useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Badge from "../../components/ui/Badge.jsx";
import toast from "react-hot-toast";

const COMMISSION_RATES = [
  { service: "Data Purchase", key: "data_purchase", rate: "2.0" },
  { service: "Airtime Purchase", key: "airtime_purchase", rate: "1.0" },
  { service: "Electricity", key: "electricity_purchase", rate: "0.5" },
  { service: "Cable TV", key: "cable_purchase", rate: "1.0" },
  { service: "Betting", key: "betting_purchase", rate: "1.0" },
];

export default function AdminSettings() {
  const [rates, setRates] = useState(COMMISSION_RATES);
  const [referralSignup, setReferralSignup] = useState("100");
  const [referralFirst, setReferralFirst] = useState("200");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      toast.success("Settings saved successfully");
      setSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Platform configuration</p>
      </div>

      {/* Platform Status */}
      <Card>
        <CardHeader title="Platform Status" />
        <div className="space-y-4">
          {[
            { label: "VTpass API", status: "operational", color: "success" },
            { label: "Paystack Payments", status: "operational", color: "success" },
            { label: "Monnify VA", status: "operational", color: "success" },
            { label: "Database", status: "operational", color: "success" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm font-medium text-gray-700">
                {item.label}
              </span>
              <Badge variant={item.color}>{item.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Referral Settings */}
      <Card>
        <CardHeader
          title="Referral Bonuses"
          subtitle="Amounts paid to referrers"
        />
        <div className="space-y-4">
          <Input
            label="Signup Bonus (₦)"
            type="number"
            value={referralSignup}
            onChange={(e) => setReferralSignup(e.target.value)}
            helper="Paid when referred user registers"
            prefix="₦"
          />

          <Input
            label="First Purchase Bonus (₦)"
            type="number"
            value={referralFirst}
            onChange={(e) => setReferralFirst(e.target.value)}
            helper="Paid when referred user makes first transaction"
            prefix="₦"
          />
        </div>
      </Card>

      {/* Commission Rates */}
      <Card>
        <CardHeader
          title="Agent Commission Rates"
          subtitle="Percentage earned per service type"
        />
        <div className="space-y-4">
          {rates.map((rate, i) => (
            <div
              key={rate.key}
              className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0"
            >
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {rate.service}
                </p>
                <p className="text-xs text-gray-400">{rate.key}</p>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  value={rate.rate}
                  onChange={(e) => {
                    const updated = [...rates];
                    updated[i] = { ...rate, rate: e.target.value };
                    setRates(updated);
                  }}
                  suffix="%"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transaction Limits */}
      <Card>
        <CardHeader title="Transaction Limits" />
        <div className="space-y-4">
          {[
            { label: "Min Wallet Funding", value: "₦100" },
            { label: "Max Wallet Funding", value: "₦1,000,000" },
            { label: "Min Airtime", value: "₦50" },
            { label: "Max Airtime", value: "₦50,000" },
            { label: "Min Electricity", value: "₦1,000" },
            { label: "Min Betting Fund", value: "₦100" },
            { label: "Max Betting Fund", value: "₦500,000" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-bold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Button size="lg" loading={saving} onClick={handleSave}>
        Save Settings
      </Button>
    </div>
  );
}