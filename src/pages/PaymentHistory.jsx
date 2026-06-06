import { useEffect, useState } from "react";
import { getPayments } from "../services/paymentService";

function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const data = await getPayments();
        setPayments(data);
      } catch (error) {
        console.error("Error loading payments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, []);

  if (loading) {
    return (
      <div className="page-panel">
        <h2>Loading payments...</h2>
      </div>
    );
  }

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">History</p>
        <h2>Payment History</h2>
        <p>Browse all recorded payments by month and transaction details.</p>
      </div>

      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
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
                  <td>{payment.memberName}</td>
                  <td>{payment.month}</td>
                  <td>₹{payment.amount}</td>
                  <td>{payment.status}</td>
                  <td>{payment.transactionId}</td>
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

export default PaymentHistory;