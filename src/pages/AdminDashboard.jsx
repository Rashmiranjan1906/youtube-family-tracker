import { useState, useEffect } from "react";
import Payments from "./Payments";
import PaymentHistory from "./PaymentHistory";
import DashboardSummary from "./DashboardSummary";
import Defaulters from "./Defaulters";
import ReminderGenerator from "./ReminderGenerator";

import {
  addMember,
  getMembers
} from "../services/memberService";
import {
  addPayment,
  getPayments
} from "../services/paymentService";
import { getUpiId, setUpiId, getAdminEmail, setAdminEmail } from "../services/settingsService";

function AdminDashboard({ user, onLogout }) {

  const [page, setPage] = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [processing, setProcessing] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [monthlyFee, setMonthlyFee] = useState(50);

  const [members, setMembers] = useState([]);
  const [adminUpi, setAdminUpi] = useState("");
  const [adminEmail, setAdminEmailState] = useState("");

  const loadMembers = async () => {
    const data = await getMembers();
    setMembers(data);
  };

  const createNextMonthDueRecords = async () => {
    setProcessing(true);
    try {
      const allMembers = await getMembers();
      const allPayments = await getPayments();
      const today = new Date();
      const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nextMonth = nextMonthDate.toISOString().slice(0, 7);
      const dueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), 5).toISOString();
      const existingMemberIds = new Set(
        allPayments
          .filter((payment) => payment.month === nextMonth)
          .map((payment) => payment.memberId)
      );

      const memberRecords = allMembers.filter(
        (member) => !existingMemberIds.has(member.id)
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

      alert(`Pending payment records created for ${memberRecords.length} member(s) for ${nextMonth}.`);
    } catch (err) {
      console.error("Failed to create due records", err);
      alert("Failed to generate due records. See console for details.");
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    loadMembers();
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

    if (!name || !email) {
      alert("Please enter Name and Email");
      return;
    }

    const member = {
      name,
      email,
      monthlyFee: Number(monthlyFee),
      active: true
    };

    await addMember(member);

    alert("Member Added");

    setName("");
    setEmail("");
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>
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
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#444" }}>View Month</span>
            <input
              type="month"
              className="input-field"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: 180 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
        <div className="dashboard-grid">
          <DashboardSummary month={selectedMonth} />

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
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmailState(e.target.value)}
                />

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="primary-button"
                    onClick={async () => {
                      try {
                        await setAdminEmail(adminEmail.trim());
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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                    <th>Monthly Fee</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone || "-"}</td>
                      <td>₹{member.monthlyFee}</td>
                      <td>{member.active ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {page === "payments" && (
        <Payments mode="admin" />
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
    </div>
  );
}

export default AdminDashboard;