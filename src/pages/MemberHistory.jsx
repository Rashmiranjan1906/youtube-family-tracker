import { useEffect, useState } from "react";
import { getPayments } from "../services/paymentService";

function MemberHistory({ currentUser }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMemberPayments = async () => {
      try {
        const allPayments = await getPayments();
        const filtered = allPayments.filter((payment) => {
          if (!currentUser) return false;
          return (
            payment.authUid === currentUser.uid ||
            payment.memberId === currentUser.uid ||
            payment.memberName === currentUser.name ||
            payment.memberName === currentUser.email
          );
        });
        setPayments(filtered);
      } catch (error) {
        console.error("Error loading member payments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMemberPayments();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="page-panel">
        <h2>Loading your payments...</h2>
      </div>
    );
  }

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">Your Payments</p>
        <h2>My Payment History</h2>
        <p>Only payments linked to your account are shown here.</p>
      </div>

      {payments.length === 0 ? (
        <p>No payments found for your account.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.month}</td>
                  <td>₹{payment.amount}</td>
                  <td>{payment.status}</td>
                  <td>{payment.transactionId || "-"}</td>
                  <td>
                    {payment.paymentDate
                      ? new Date(payment.paymentDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {payment.paymentGateway === "qr_upi"
                      ? "UPI QR"
                      : payment.paymentGateway === "manual"
                      ? "Manual"
                      : payment.paymentGateway || "-"}
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

export default MemberHistory;
