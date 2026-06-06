import { useEffect, useState } from "react";
import { getPayments } from "../services/paymentService";

function PaymentHistory({ monthFilter }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const downloadReceipt = (payment) => {
    if (!payment.screenshotData) {
      return;
    }

    const link = document.createElement("a");
    link.href = payment.screenshotData;
    link.download = payment.screenshotFileName || `receipt-${payment.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadInvoice = (payment) => {
    const formattedDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : "-";
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice - ${payment.memberName}</title>
<style>
body{font-family: Inter, system-ui, sans-serif; margin:0; padding:24px; color:#23213c; background:#f4f5fb;}
.container{max-width:760px; margin:0 auto; background:#fff; border-radius:24px; box-shadow:0 20px 70px rgba(28,22,64,.12); padding:32px;}
header{display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;}
.brand{font-size:1.2rem; font-weight:800; color:#4f46e5;}
section{margin-bottom:24px;}
.label{color:#6b7280; font-size:.85rem; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; display:block;}
.value{font-size:1.05rem; font-weight:600; color:#111827;}
.table{width:100%; border-collapse:collapse; margin-top:16px;}
.table th, .table td{padding:16px; text-align:left; border-bottom:1px solid #e5e7eb;}
.table th{background:#f8fafc; color:#374151; font-weight:700;}
.footer{display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid #e5e7eb;}
.total{font-size:1.4rem; font-weight:800; color:#111827;}
</style>
</head>
<body>
<div class="container">
<header>
  <div>
    <div class="brand">YouTube Premium Family</div>
    <div class="label">Invoice</div>
  </div>
  <div>
    <div class="value">${payment.month || "N/A"}</div>
    <div class="label">Paid on</div>
    <div class="value">${formattedDate}</div>
  </div>
</header>
<section>
  <div class="label">Member</div>
  <div class="value">${payment.memberName || "-"}</div>
</section>
<section>
  <table class="table">
    <thead>
      <tr><th>Description</th><th>Value</th></tr>
    </thead>
    <tbody>
      <tr><td>Status</td><td>${payment.status || "Pending"}</td></tr>
      <tr><td>Payment Method</td><td>${payment.paymentGateway === "qr_upi" ? "UPI QR" : payment.paymentGateway === "manual" ? "Manual" : payment.paymentGateway || "-"}</td></tr>
      <tr><td>Transaction ID</td><td>${payment.transactionId || "-"}</td></tr>
      <tr><td>Due Date</td><td>${payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "-"}</td></tr>
    </tbody>
  </table>
</section>
<div class="footer">
  <div class="label">Invoice generated for YouTube Premium Family subscription</div>
  <div class="total">₹${payment.amount}</div>
</div>
</div>
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${payment.memberName?.replace(/\s+/g, "_") || "member"}-${payment.month || "invoice"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const data = await getPayments();
        setPayments(monthFilter ? data.filter((payment) => payment.month === monthFilter) : data);
      } catch (error) {
        console.error("Error loading payments:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [monthFilter]);

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
                <th>Receipt</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.memberName}</td>
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
                  <td>
                    {payment.screenshotData ? (
                      <button
                        className="secondary-button"
                        onClick={() => downloadReceipt(payment)}
                      >
                        Receipt
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => downloadInvoice(payment)}
                    >
                      Invoice
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

export default PaymentHistory;