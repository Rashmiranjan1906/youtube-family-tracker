import { useEffect, useState } from "react";
import { getMembers } from "../services/memberService";
import { getPaymentsByMonth } from "../services/paymentService";

function DashboardSummary({ month }) {

  const [summary, setSummary] = useState({
    totalMembers: 0,
    expectedAmount: 0,
    collectedAmount: 0,
    pendingAmount: 0,
    paidMembers: 0,
    pendingMembers: 0
  });

  useEffect(() => {

    const loadSummary = async () => {

      const members = await getMembers();

      const payments = await getPaymentsByMonth(month || new Date().toISOString().slice(0, 7));

      const totalMembers =
        members.length;

      const expectedAmount =
        members.reduce(
          (sum, member) =>
            sum + Number(member.monthlyFee || 0),
          0
        );

      const paidPayments = payments.filter(
        (payment) => payment.status?.toLowerCase() === "paid"
      );

      const collectedAmount =
        paidPayments.reduce(
          (sum, payment) =>
            sum + Number(payment.amount || 0),
          0
        );

      const paidMembers =
        new Set(
          paidPayments.map(
            payment =>
              payment.memberId
          )
        ).size;

      const pendingMembers =
        totalMembers - paidMembers;

      const pendingAmount =
        expectedAmount -
        collectedAmount;

      setSummary({
        totalMembers,
        expectedAmount,
        collectedAmount,
        pendingAmount,
        paidMembers,
        pendingMembers
      });

    };

    loadSummary();

  }, [month]);

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">Overview</p>
        <h2>Monthly Summary</h2>
        <p>See how the family plan is tracking this month.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>{summary.totalMembers}</h3>
          <p>Total Members</p>
        </div>
        <div className="stat-card">
          <h3>₹{summary.expectedAmount}</h3>
          <p>Expected Amount</p>
        </div>
        <div className="stat-card">
          <h3>₹{summary.collectedAmount}</h3>
          <p>Collected Amount</p>
        </div>
        <div className="stat-card">
          <h3>₹{summary.pendingAmount}</h3>
          <p>Pending Amount</p>
        </div>
        <div className="stat-card">
          <h3>{summary.paidMembers}</h3>
          <p>Paid Members</p>
        </div>
        <div className="stat-card">
          <h3>{summary.pendingMembers}</h3>
          <p>Pending Members</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;
