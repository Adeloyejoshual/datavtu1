import { useState, useEffect } from "react";
import { adminApi } from "../../api/admin.api.js";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import RevenueChart from "../../components/admin/RevenueChart.jsx";
import ServiceBreakdown from "../../components/admin/ServiceBreakdown.jsx";
import UserGrowthChart from "../../components/admin/UserGrowthChart.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { formatCurrency } from "../../utils/format.js";
import clsx from "clsx";

const PERIODS = [
  { label: "7 Days", value: "7days" },
  { label: "30 Days", value: "30days" },
  { label: "12 Months", value: "12months" },
];

export default function AdminAnalytics() {
  const [revenue, setRevenue] = useState([]);
  const [services, setServices] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [period, setPeriod] = useState("30days");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [period]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [revRes, svcRes, growthRes] = await Promise.all([
        adminApi.getRevenue({ period }),
        adminApi.getServiceStats(),
        adminApi.getUserGrowth(),
      ]);
      setRevenue(revRes.data);
      setServices(svcRes.data);
      setGrowth(growthRes.data);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  // Compute totals from revenue data
  const totalVolume = revenue.reduce(
    (sum, d) => sum + parseFloat(d.volume || 0), 0
  );
  const totalTx = revenue.reduce(
    (sum, d) => sum + parseInt(d.successful || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Platform performance metrics</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
          <p className="text-blue-200 text-sm font-medium">Total Volume</p>
          <p className="text-3xl font-black mt-1">
            {formatCurrency(totalVolume)}
          </p>
          <p className="text-blue-200 text-xs mt-2">
            Period: {PERIODS.find((p) => p.value === period)?.label}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
          <p className="text-green-100 text-sm font-medium">
            Successful Transactions
          </p>
          <p className="text-3xl font-black mt-1">
            {totalTx.toLocaleString()}
          </p>
          <p className="text-green-100 text-xs mt-2">Completed transactions</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader
          title="Revenue Trend"
          subtitle="Transaction volume over selected period"
        />
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <RevenueChart data={revenue} period={period} />
        )}
      </Card>

      {/* Service + Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Service Performance"
            subtitle="Last 30 days breakdown"
          />
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <ServiceBreakdown data={services} />
          )}
        </Card>

        <Card>
          <CardHeader
            title="User Growth"
            subtitle="New registrations per day"
          />
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <UserGrowthChart data={growth} />
          )}
        </Card>
      </div>

      {/* Service Table */}
      {!loading && services.length > 0 && (
        <Card>
          <CardHeader title="Service Details" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Service", "Total Tx", "Success", "Failed", "Volume", "Rate"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr
                    key={svc.type}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-3.5 px-4 font-semibold text-gray-800 capitalize">
                      {svc.type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {parseInt(svc.total).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-green-600 font-semibold">
                      {parseInt(svc.successful).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-red-500">
                      {parseInt(svc.failed).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-800">
                      {formatCurrency(svc.volume)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${svc.success_rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {svc.success_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}