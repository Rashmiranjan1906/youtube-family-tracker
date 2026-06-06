import { useEffect, useState } from "react";
import { getMembers } from "../services/memberService";
import { getCurrentMonthPayments } from "../services/paymentService";

function ReminderGenerator() {

  const [pendingMembers, setPendingMembers] = useState([]);

  useEffect(() => {

    const loadPendingMembers = async () => {

      const members = await getMembers();

      const payments =
        await getCurrentMonthPayments();

      const paidMemberIds =
        payments.map(
          payment => payment.memberId
        );

      const pending =
        members.filter(
          member =>
            !paidMemberIds.includes(
              member.id
            )
        );

      setPendingMembers(pending);
    };

    loadPendingMembers();

  }, []);

  const dueDay = 5;
  const today = new Date();
  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const isOverdue = today > dueDate;

  const buildMessage = (member) => {
    const dueText = isOverdue
      ? "This payment is overdue."
      : `Please complete the payment on or before ${dueDate.toLocaleDateString()}.`;

    return `Hi ${member.name},\n\nYour YouTube Premium Family contribution of ₹${member.monthlyFee} for this month is still pending. ${dueText}\n\nPlease complete the payment as soon as possible.\n\nThank you.`;
  };

  const copyReminder = (member) => {
    const message = buildMessage(member);
    navigator.clipboard.writeText(message);
    alert(`Reminder copied for ${member.name}`);
  };

  const sendEmailReminder = (member) => {
    if (!member.email) {
      alert("No email address available for this member.");
      return;
    }

    const subject = encodeURIComponent("Payment reminder: YouTube Premium Family");
    const body = encodeURIComponent(buildMessage(member));
    const mailto = `mailto:${member.email}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  };

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">Reminders</p>
        <h2>Reminder Generator</h2>
        <p>Copy personalized reminders for members who still need to pay, or send them by email.</p>
      </div>

      {pendingMembers.length === 0 ? (
        <p>Everyone has paid 🎉</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Fee</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingMembers.map((member) => (
                <tr key={member.id}>
                  <td data-label="Name">{member.name}</td>
                  <td data-label="Email">{member.email}</td>
                  <td data-label="Fee">₹{member.monthlyFee}</td>
                  <td data-label="Actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      className="secondary-button"
                      onClick={() => copyReminder(member)}
                    >
                      Copy Reminder
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => sendEmailReminder(member)}
                    >
                      Email Reminder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReminderGenerator;
