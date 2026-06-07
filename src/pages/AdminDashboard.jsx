import { useState, useEffect } from "react";
import Payments from "./Payments";
import PaymentHistory from "./PaymentHistory";
import DashboardSummary from "./DashboardSummary";
import Defaulters from "./Defaulters";
import ReminderGenerator from "./ReminderGenerator";
import ActivityLogs from "./ActivityLogs";

import {
  addMember,
  getMembers
} from "../services/memberService";
import { auth } from "../services/auth";
import { updatePassword } from "firebase/auth";
import {
  addPayment,
  getPayments
} from "../services/paymentService";
import { getUpiId, setUpiId, getAdminEmail, setAdminEmail } from "../services/settingsService";
import { logActivity } from "../services/auditService";
import { isValidEmail, isValidPhone } from "../utils/validation";

function AdminDashboard({ user, onLogout }) {

  const [page, setPage] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [processing, setProcessing] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyFee, setMonthlyFee] = useState(50);

  const [members, setMembers] = useState([]);
  const [adminUpi, setAdminUpi] = useState("");
  const [adminEmail, setAdminEmailState] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [showAdminPasswordForm, setShowAdminPasswordForm] = useState(false);

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const createNextMonthDueRecords = async () => {
    setProcessing(true);
    try {
      const allMembers = await getMembers();
      const allPayments = await getPayments();
      const [year, monthIndex] = (selectedMonth || new Date().toISOString().slice(0, 7))
        .split("-")
        .map(Number);
      const currentMonth = `${year}-${String(monthIndex).padStart(2, "0")}`;
      const nextMonthDate = new Date(year, monthIndex, 1);
      const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
      const dueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 5).toISOString();
      const activeMembers = allMembers.filter((member) => member.active !== false);
      const paidMemberIds = new Set(
        allPayments
          .filter(
            (payment) =>
              payment.month === currentMonth &&
              payment.status?.toLowerCase() === "paid"
          )
          .map((payment) => payment.memberId)
      );
      const existingMemberIds = new Set(
        allPayments
          .filter((payment) => payment.month === nextMonth)
          .map((payment) => payment.memberId)
      );

      if (activeMembers.length === 0) {
        alert("No active members found.");
        return;
      }

      const unpaidMembers = activeMembers.filter(
        (member) => !paidMemberIds.has(member.id)
      );

      if (unpaidMembers.length > 0) {
        alert(
          `Only ${activeMembers.length - unpaidMembers.length} of ${activeMembers.length} active member(s) are paid for ${currentMonth}. Generate the next month only after everyone has paid.`
        );
        return;
      }

      const memberRecords = activeMembers.filter(
        (member) => paidMemberIds.has(member.id) && !existingMemberIds.has(member.id)
      );

      if (memberRecords.length === 0) {
        alert(`All members already have a due record for ${nextMonth}.`);
        return;
      }

      for (const member of memberRecords) {
        await addPayment({
          memberId: member.id,
          authUid: member.authUid || null,
          memberName: member.name,
          amount: Number(member.monthlyFee || 0),
          transactionId: "",
          month: nextMonth,
          status: "Pending",
          paymentDate: null,
          paymentGateway: "due",
          dueDate,
          screenshotData: null,
          screenshotFileName: null
        });
      }

      await logActivity({
        actorRole: "admin",
        actorUid: user?.uid,
        actorEmail: user?.email,
        action: "create_next_month_due_records",
        details: {
          currentMonth,
          nextMonth,
          recordsCreated: memberRecords.length
        }
      });
      alert(`Pending payment records created for ${memberRecords.length} paid member(s) for ${nextMonth}.`);
    } catch (err) {
      console.error("Failed to create due records", err);
      alert("Failed to generate due records. See console for details.");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    const loadInitialMembers = async () => {
      const data = await getMembers();
      setMembers(data);
    };

    loadInitialMembers();
    const loadUpi = async () => {
      try {
        const upi = await getUpiId();
        setAdminUpi(upi || "");
        const aemail = await getAdminEmail();
        setAdminEmailState(aemail || "");
      } catch (err) {
        console.error("Failed to load settings", err);
      }
    };
    loadUpi();
  }, []);

  const handleSave = async () => {

    if (!name || !email || !phone) {
      alert("Please enter Name, Email, and Phone");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address");
      return;
    }

    if (!isValidPhone(phone)) {
      alert("Please enter a valid phone number");
      return;
    }

    const member = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      monthlyFee: Number(monthlyFee),
      active: true
    };

    const memberId = await addMember(member);
    await logActivity({
      actorRole: "admin",
      actorUid: user?.uid,
      actorEmail: user?.email,
      action: "admin_add_member",
      details: {
        memberId,
        memberName: member.name,
        memberEmail: member.email
      }
    });

    alert("Member Added");

    setName("");
    setEmail("");
    setPhone("");
    setMonthlyFee(50);

    loadMembers();
  };

  return (
    <div className="app-shell">

      <div className="topbar" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">YouTube Premium Family</p>
            <h1>Family Tracker</h1>
            <p className="subtitle">
              Manage members, payments, defaulters, and reminders from one polished dashboard.
            </p>
            {user?.email && (
              <p style={{ marginTop: 8, color: "#666" }}>
                Signed in as <strong>{user.email}</strong>
              </p>
            )}
          </div>

          <nav className="admin-nav" aria-label="Admin sections">
            <button
              className={`secondary-button ${page === "dashboard" ? "active" : ""}`}
              onClick={() => setPage("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`secondary-button ${page === "payments" ? "active" : ""}`}
              onClick={() => setPage("payments")}
            >
              Record Payment
            </button>
            <button
              className={`secondary-button ${page === "members" ? "active" : ""}`}
              onClick={() => setPage("members")}
            >
              Add Member
            </button>
            <button
              className={`secondary-button ${page === "history" ? "active" : ""}`}
              onClick={() => setPage("history")}
            >
              Payment History
            </button>
            <button
              className={`secondary-button ${page === "defaulters" ? "active" : ""}`}
              onClick={() => setPage("defaulters")}
            >
              Defaulters
            </button>
            <button
              className={`secondary-button ${page === "reminders" ? "active" : ""}`}
              onClick={() => setPage("reminders")}
            >
              Reminders
            </button>
            <button
              className={`secondary-button ${page === "activity" ? "active" : ""}`}
              onClick={() => setPage("activity")}
            >
              Activity
            </button>
          </nav>
        </div>

        <div className="admin-toolbar">
          <div className="month-control">
            <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#444" }}>View Month</span>
            <input
              type="month"
              className="input-field"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </div>

          <div className="admin-actions">
            <button
              className="secondary-button"
              onClick={createNextMonthDueRecords}
              disabled={processing}
            >
              {processing ? "Generating…" : "Create next month due records"}
            </button>
            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
            <button
              className="secondary-button"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {page === "dashboard" && (
        <div className="dashboard-grid dashboard-only">
          <DashboardSummary month={selectedMonth} />
        </div>
      )}

      {page === "members" && (
        <div className="dashboard-grid">
          <div className="page-panel">
            <div className="panel-header">
              <p className="eyebrow">Family Members</p>
              <h2>Add Member</h2>
              <p>Add new family members and review the members list in one place.</p>
            </div>

            <div style={{ marginBottom: 16 }} className="form-grid">
              <label className="input-label">Admin UPI ID</label>
              <input
                className="input-field"
                placeholder="e.g., yourname@upi"
                value={adminUpi}
                onChange={(e) => setAdminUpi(e.target.value)}
              />

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="primary-button"
                  onClick={async () => {
                    try {
                      await setUpiId(adminUpi.trim());
                      await logActivity({
                        actorRole: "admin",
                        actorUid: user?.uid,
                        actorEmail: user?.email,
                        action: "admin_update_upi"
                      });
                      alert("Admin UPI saved");
                    } catch (err) {
                      console.error(err);
                      alert("Failed to save UPI");
                    }
                  }}
                >
                  Save UPI
                </button>
                <p style={{ color: "#666", fontSize: "0.9rem", alignSelf: "center" }}>
                  This UPI will be shown to members when they make payments.
                </p>
              </div>

              <div style={{ marginTop: 12 }} className="form-grid">
                <label className="input-label">Admin Email (for Admin Login)</label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmailState(e.target.value)}
                />

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="primary-button"
                    onClick={async () => {
                      try {
                        const trimmedEmail = adminEmail.trim();
                        if (!trimmedEmail) return alert("Please enter admin email");
                        if (!isValidEmail(trimmedEmail)) return alert("Please enter a valid admin email address");

                        await setAdminEmail(trimmedEmail);
                        await logActivity({
                          actorRole: "admin",
                          actorUid: user?.uid,
                          actorEmail: user?.email,
                          action: "admin_update_login_email",
                          details: { adminEmail: trimmedEmail }
                        });
                        alert("Admin email saved");
                      } catch (err) {
                        console.error(err);
                        alert("Failed to save admin email");
                      }
                    }}
                  >
                    Save Admin Email
                  </button>
                  <p style={{ color: "#666", fontSize: "0.9rem", alignSelf: "center" }}>
                    Only the configured admin email can use the Admin login.
                  </p>
                </div>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() => setShowAdminPasswordForm((show) => !show)}
                style={{ marginTop: 12 }}
              >
                {showAdminPasswordForm ? "Hide Admin Password Update" : "Admin Password Update"}
              </button>

              {showAdminPasswordForm && (
                <div style={{ marginTop: 12 }} className="form-grid">
                  <h3>Change Admin Password</h3>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="New password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                  />
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Confirm password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="primary-button"
                      onClick={async () => {
                        if (!adminNewPassword || !adminConfirmPassword) return alert("Fill both password fields");
                        if (adminNewPassword !== adminConfirmPassword) return alert("Passwords do not match");
                        if (adminNewPassword.length < 6) return alert("Password should be at least 6 characters");

                        const currentUser = auth.currentUser;
                        if (!currentUser) return alert("Admin not authenticated");

                        try {
                          await updatePassword(currentUser, adminNewPassword);
                          await logActivity({
                            actorRole: "admin",
                            actorUid: user?.uid,
                            actorEmail: user?.email,
                            action: "admin_update_password"
                          });
                          alert("Admin password updated successfully");
                          setAdminNewPassword("");
                          setAdminConfirmPassword("");
                          setShowAdminPasswordForm(false);
                        } catch (err) {
                          console.error(err);
                          if (err.code === "auth/requires-recent-login") {
                            alert("Please re-login and try again");
                          } else {
                            alert("Failed to update password");
                          }
                        }
                      }}
                    >
                      Update Admin Password
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="form-grid">
              <input
                className="input-field"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="input-field"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="input-field"
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <input
                className="input-field"
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
              />

              <button className="primary-button" onClick={handleSave}>
                Save Member
              </button>
            </div>

            <div className="table-wrap">
              <h2 className="table-title">Current Members</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Monthly Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td data-label="Name">{member.name}</td>
                      <td data-label="Email">{member.email}</td>
                      <td data-label="Phone">{member.phone || "-"}</td>
                      <td data-label="Monthly Fee">₹{member.monthlyFee}</td>
                      <td data-label="Status">{member.active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {page === "payments" && (
        <Payments mode="admin" currentUser={user} />
      )}

      {page === "history" && (
        <PaymentHistory monthFilter={selectedMonth} />
      )}

      {page === "defaulters" && (
        <Defaulters month={selectedMonth} />
      )}
      {page === "reminders" && (
        <ReminderGenerator />
      )}
      {page === "activity" && (
        <ActivityLogs />
      )}
    </div>
  );
}

export default AdminDashboard;
