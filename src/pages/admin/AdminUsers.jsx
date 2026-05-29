import { useState, useEffect, useCallback } from "react";
import { adminApi } from "../../api/admin.api.js";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Table, { TableRow, TableCell } from "../../components/ui/Table.jsx";
import { formatCurrency, formatDateShort, getInitials } from "../../utils/format.js";
import toast from "react-hot-toast";
import { Search, UserCheck, Ban, Wallet, ChevronDown } from "lucide-react";

const ROLE_COLORS = {
  user: "default",
  agent: "info",
  admin: "purple",
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [creditModal, setCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [userDetail, setUserDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const limit = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page,
        limit,
        search: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(res.data);
      setTotal(res.pagination?.total || 0);
    } catch {}
    finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setDetailModal(true);
    setLoadingDetail(true);
    try {
      const res = await adminApi.getUserDetail(user.id);
      setUserDetail(res.data);
    } catch {}
    finally {
      setLoadingDetail(false);
    }
  };

  const handleCreditWallet = async () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    setCreditLoading(true);
    try {
      await adminApi.creditWallet({
        user_id: selectedUser.id,
        amount: parseFloat(creditAmount),
        reason: creditReason,
      });
      toast.success("Wallet credited successfully");
      setCreditModal(false);
      setCreditAmount("");
      setCreditReason("");
      fetchUsers();
    } catch {}
    finally {
      setCreditLoading(false);
    }
  };

  const handleRoleUpdate = async (userId, role) => {
    try {
      await adminApi.updateUserRole(userId, role);
      toast.success("Role updated");
      fetchUsers();
    } catch {}
  };

  const handleSuspend = async (userId) => {
    try {
      const res = await adminApi.suspendUser(userId);
      toast.success(res.message);
      fetchUsers();
      if (detailModal) setDetailModal(false);
    } catch {}
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Roles</option>
            <option value="user">Users</option>
            <option value="agent">Agents</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table
            headers={[
              "User",
              "Phone",
              "Role",
              "Balance",
              "Transactions",
              "Joined",
              "Status",
              "Actions",
            ]}
            empty={users.length === 0 ? "No users found" : null}
          >
            {users.map((user) => (
              <TableRow key={user.id} onClick={() => openUserDetail(user)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-bold text-xs">
                        {getInitials(user.first_name, user.last_name)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm">{user.phone}</span>
                </TableCell>

                <TableCell>
                  <Badge variant={ROLE_COLORS[user.role]} size="sm">
                    {user.role}
                  </Badge>
                </TableCell>

                <TableCell>
                  <span className="text-sm font-semibold">
                    {formatCurrency(user.wallet_balance)}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-sm">
                    {parseInt(user.transaction_count).toLocaleString()}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-sm text-gray-500">
                    {formatDateShort(user.created_at)}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={user.is_verified ? "success" : "error"}
                    size="sm"
                  >
                    {user.is_verified ? "Active" : "Suspended"}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setCreditModal(true);
                      }}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Credit wallet"
                    >
                      <Wallet size={15} className="text-blue-600" />
                    </button>

                    <button
                      onClick={() => handleSuspend(user.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={user.is_verified ? "Suspend" : "Activate"}
                    >
                      {user.is_verified ? (
                        <Ban size={15} className="text-red-500" />
                      ) : (
                        <UserCheck size={15} className="text-green-600" />
                      )}
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} users
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* User Detail Modal */}
      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title="User Details"
        size="lg"
      >
        {loadingDetail ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : userDetail ? (
          <div className="space-y-5">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                <span className="text-blue-700 font-black text-xl">
                  {getInitials(
                    userDetail.user.first_name,
                    userDetail.user.last_name
                  )}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {userDetail.user.first_name} {userDetail.user.last_name}
                </h3>
                <p className="text-sm text-gray-500">{userDetail.user.email}</p>
                <p className="text-sm text-gray-500">{userDetail.user.phone}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Balance",
                  value: formatCurrency(userDetail.user.wallet_balance),
                },
                {
                  label: "Referrals",
                  value: userDetail.referral_count,
                },
                {
                  label: "Role",
                  value: userDetail.user.role,
                },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="font-bold text-gray-800 capitalize">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Role Selector */}
            <div>
              <label className="label">Change Role</label>
              <div className="flex gap-2">
                {["user", "agent", "admin"].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleUpdate(userDetail.user.id, role)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border capitalize transition-all
                      ${userDetail.user.role === role
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            {userDetail.recent_transactions.length > 0 && (
              <div>
                <p className="label">Recent Transactions</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userDetail.recent_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-700 capitalize">
                          {tx.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDateShort(tx.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800">
                          {formatCurrency(tx.amount)}
                        </p>
                        <Badge
                          variant={
                            tx.status === "success"
                              ? "success"
                              : tx.status === "failed"
                              ? "error"
                              : "warning"
                          }
                          size="sm"
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setDetailModal(false);
                  setCreditModal(true);
                }}
              >
                <Wallet size={16} />
                Credit Wallet
              </Button>

              <Button
                variant={userDetail.user.is_verified ? "danger" : "success"}
                fullWidth
                onClick={() => handleSuspend(userDetail.user.id)}
              >
                {userDetail.user.is_verified ? (
                  <>
                    <Ban size={16} /> Suspend
                  </>
                ) : (
                  <>
                    <UserCheck size={16} /> Activate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Credit Wallet Modal */}
      <Modal
        isOpen={creditModal}
        onClose={() => setCreditModal(false)}
        title="Credit Wallet"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">
              Crediting wallet for{" "}
              <span className="font-semibold text-gray-900">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Current balance:{" "}
              {formatCurrency(selectedUser?.wallet_balance)}
            </p>
          </div>

          <Input
            label="Amount (₦)"
            type="number"
            placeholder="Enter amount"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            prefix="₦"
          />

          <Input
            label="Reason (optional)"
            placeholder="Enter reason for credit"
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setCreditModal(false)}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={creditLoading}
              onClick={handleCreditWallet}
            >
              Credit Wallet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}