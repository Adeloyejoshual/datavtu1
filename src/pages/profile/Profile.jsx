import { useState } from "react";
import { authApi } from "../../api/auth.api.js";
import useAuthStore from "../../store/useAuthStore.js";
import Card, { CardHeader } from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import { getInitials } from "../../utils/format.js";
import toast from "react-hot-toast";

export default function Profile() {
  const { user, logout } = useAuthStore();

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(passwordForm);
      toast.success("Password changed successfully");
      setPasswordForm({ current_password: "", new_password: "" });
    } catch {}
    finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account</p>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center">
            <span className="text-blue-700 font-black text-2xl">
              {getInitials(user?.first_name, user?.last_name)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-gray-500">{user?.email}</p>
            <p className="text-gray-500 text-sm">{user?.phone}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Account Details */}
      <Card>
        <CardHeader title="Account Details" />
        <div className="space-y-4">
          {[
            { label: "Full Name", value: `${user?.first_name} ${user?.last_name}` },
            { label: "Email Address", value: user?.email },
            { label: "Phone Number", value: user?.phone },
            { label: "Referral Code", value: user?.referral_code },
            {
              label: "Account Status",
              value: user?.is_verified ? "Verified ✅" : "Unverified",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader title="Change Password" />
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm((p) => ({
                ...p,
                current_password: e.target.value,
              }))
            }
          />
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={passwordForm.new_password}
            onChange={(e) =>
              setPasswordForm((p) => ({
                ...p,
                new_password: e.target.value,
              }))
            }
          />
          <Button type="submit" loading={changingPassword}>
            Update Password
          </Button>
        </form>
      </Card>

      {/* Logout */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800">Sign out</p>
            <p className="text-sm text-gray-500 mt-0.5">
              Sign out of your account on this device
            </p>
          </div>
          <Button variant="danger" onClick={logout} size="sm">
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}