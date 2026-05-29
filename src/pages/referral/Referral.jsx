import { useState, useEffect } from "react";
import { referralApi } from "../../api/referral.api.js";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { formatCurrency, formatDateShort } from "../../utils/format.js";
import toast from "react-hot-toast";

export default function Referral() {
  const [data, setData] = useState(null);
  const [commissions, setCommissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [refRes, comRes] = await Promise.all([
        referralApi.getStats(),
        referralApi.getCommissions().catch(() => ({ data: null })),
      ]);
      setData(refRes.data);
      setCommissions(comRes.data);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(data?.referral_link || "");
    toast.success("Referral link copied!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Referrals</h1>
        <p className="text-gray-500 mt-1">Earn by inviting friends</p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm font-medium mb-1">Your Referral Code</p>
        <p className="text-3xl font-black tracking-widest mb-4">
          {data?.referral_code}
        </p>

        <button
          onClick={copyLink}
          className="w-full bg-white/10 hover:bg-white/20 border border-white/20
                     text-white text-sm font-semibold py-3 rounded-xl transition-all"
        >
          📋 Copy Referral Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            label: "Total Earned",
            value: formatCurrency(data?.earnings?.total_earned),
            icon: "💰",
            color: "bg-green-50",
          },
          {
            label: "Total Referrals",
            value: data?.earnings?.total_referrals || 0,
            icon: "👥",
            color: "bg-blue-50",
          },
          {
            label: "Signup Bonuses",
            value: formatCurrency(data?.earnings?.signup_bonuses),
            icon: "🎁",
            color: "bg-purple-50",
          },
          {
            label: "Purchase Bonuses",
            value: formatCurrency(data?.earnings?.purchase_bonuses),
            icon: "🛍️",
            color: "bg-yellow-50",
          },
        ].map((stat) => (
          <Card key={stat.label} className={stat.color}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-lg font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader title="How It Works" />
        <div className="space-y-4">
          {[
            {
              step: "1",
              title: "Share your link",
              desc: "Share your unique referral link with friends",
            },
            {
              step: "2",
              title: "They register",
              desc: "Earn ₦100 when they sign up using your link",
            },
            {
              step: "3",
              title: "They transact",
              desc: "Earn ₦200 when they make their first purchase",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-sm">{item.step}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Referrals List */}
      {data?.referrals?.length > 0 && (
        <Card>
          <CardHeader
            title="My Referrals"
            subtitle={`${data.referrals.length} people`}
          />
          <div className="space-y-3">
            {data.referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {ref.first_name} {ref.last_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Joined {formatDateShort(ref.joined_at)}
                  </p>
                </div>
                {ref.bonus_earned && (
                  <Badge variant="success">
                    +{formatCurrency(ref.bonus_earned)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent Commissions */}
      {commissions?.totals && (
        <Card>
          <CardHeader title="Agent Commissions" subtitle="Earnings from transactions" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Total Earned</p>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency(commissions.totals.total_earned)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">This Month</p>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency(commissions.totals.this_month)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}