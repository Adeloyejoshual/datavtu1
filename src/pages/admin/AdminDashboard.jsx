import { useState, useEffect } from "react";
import { adminApi } from "../../api/admin.api.js";
import StatCard from "../../components/admin/StatCard.jsx";
import RevenueChart from "../../components/admin/RevenueChart.jsx";
import ServiceBreakdown from "../../components/admin/ServiceBreakdown.jsx";
import UserGrowthChart from "../../components/admin/UserGrowthChart.jsx";
import RecentActivity from "../../components/admin/RecentActivity.jsx";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { formatCurrency } from "../../utils/format.js";
import clsx from "clsx";

const PERIODS = [
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "12 Months", value: "12months" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [services, setServices] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7days");
  const [loadingRevenue, setLoadingRevenue] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [period]);

  const fetchAll = async () => {
    try {
      const [dashRes, serviceRes, growthRes, txRes] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getServiceStats(),
        adminApi.getUserGrowth(),
        adminApi.getTransactions({ limit: 8 }),
      ]);

      setStats(dashRes.data);
      setServices(serviceRes.data);
      setUserGrowth(growthRes.data);
      setRecentTx(txRes.data);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    setLoadingRevenue(true);
    try {
      const res = await adminApi.getRevenue({ period });
      setRevenue(res.data);
    } catch {}
    finally {
      setLoadingRevenue(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and analytics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={parseInt(
            stats?.users?.total || 0
          ).toLocaleString()}
          subtitle={`+${stats?.users?.today || 0} today`}
          icon="👥"
          color="blue"
          trend="up"
          trendValue={`+${stats?.users?.this_week || 0} this week`}
        />

        <StatCard
          title="Total Volume"
          value={formatCurrency(stats?.revenue?.total_volume)}
          subtitle={`${formatCurrency(stats?.revenue?.today_volume)} today`}
          icon="💰"
          color="green"
          trend="up"
        />

        <StatCard
          title="Transactions"
          value={parseInt(
            stats?.transactions?.total || 0
          ).toLocaleString()}
          subtitle={`${stats?.transactions?.today || 0} today`}
          icon="📊"
          color="purple"
        />

        <StatCard
          title="Wallet Balances"
          value={formatCurrency(stats?.total_wallet_balance)}
          subtitle={`${stats?.transactions?.pending || 0} pending tx`}
          icon="🏦"
          color="orange"
        />
      </div>

      {/* Transaction Summary Pills */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Successful",
            value: stats?.transactions?.successful,
            color: "bg-green-50 text-green-700 border-green-100",
          },
          {
            label: "Failed",
            value: stats?.transactions?.failed,
            color: "bg-red-50 text-red-700 border-red-100",
          },
          {
            label: "Pending",
            value: stats?.transactions?.pending,
            color: "bg-yellow-50 text-yellow-700 border-yellow-100",
          },
          {
            label: "Agents",
            value: stats?.users?.agents,
            color: "bg-blue-50 text-blue-700 border-blue-100",
          },
        ].map((item) => (
          <div
            key={item.label}
            className={clsx(
              "rounded-2xl border p-4 text-center",
              item.color
            )}
          >
            <p className="text-2xl font-black">
              {parseInt(item.value || 0).toLocaleString()}
            </p>
            <p className="text-xs font-semibold mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="section-title">Revenue Overview</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Transaction volume over time
            </p>
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === p.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loadingRevenue ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <RevenueChart data={revenue} period={period} />
        )}
      </Card>

      {/* Service Breakdown + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Service Breakdown"
            subtitle="Last 30 days"
          />
          <ServiceBreakdown data={services} />
        </Card>

        <Card>
          <CardHeader
            title="User Growth"
            subtitle="Last 30 days"
          />
          <UserGrowthChart data={userGrowth} />
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader
          title="Recent Transactions"
          subtitle="Latest platform activity"
        />
        <RecentActivity transactions={recentTx} />
      </Card>
    </div>
  );
}