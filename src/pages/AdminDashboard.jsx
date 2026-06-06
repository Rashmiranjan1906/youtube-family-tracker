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
import { getUpiId, setUpiId, getAdminEmail, setAdminEmail } from "../services/settingsService";

function AdminDashboard() {

  const [page, setPage] = useState("dashboard");

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

      <div className="topbar">
        <div>
          <p className="eyebrow">YouTube Premium Family</p>
          <h1>Family Tracker</h1>
          <p className="subtitle">
            Manage members, payments, defaulters, and reminders from one polished dashboard.
          </p>
        </div>

        <div className="button-group">
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

      {page === "dashboard" && (
        <div className="dashboard-grid">
          <DashboardSummary />

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
        <PaymentHistory />
      )}

      {page === "defaulters" && (
        <Defaulters />
      )}
      {page === "reminders" && (
        <ReminderGenerator />
      )}
    </div>
  );
}

export default AdminDashboard;