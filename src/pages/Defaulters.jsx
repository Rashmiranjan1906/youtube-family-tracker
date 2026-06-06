import { useEffect, useState } from "react";
import { getMembers } from "../services/memberService";
import { getPaymentsByMonth } from "../services/paymentService";

function Defaulters({ month }) {

  const [defaulters, setDefaulters] = useState([]);
  const [membersCount, setMembersCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);

  useEffect(() => {

    const loadDefaulters = async () => {

      try {

        const members = await getMembers();
        console.log("Members:", members);

        const payments = await getPaymentsByMonth(month || new Date().toISOString().slice(0, 7));
        console.log("Payments:", payments);

        setMembersCount(members.length);
        setPaymentsCount(payments.length);

        const paidMemberIds =
          payments.map(
            payment => payment.memberId
          );

        console.log(
          "Paid Member IDs:",
          paidMemberIds
        );

        const pendingMembers =
          members.filter(
            member =>
              !paidMemberIds.includes(
                member.id
              )
          );

        console.log(
          "Pending Members:",
          pendingMembers
        );

        setDefaulters(
          pendingMembers
        );

      } catch (error) {
        console.error(
          "Defaulters Error:",
          error
        );
      }
    };

    loadDefaulters();

  }, [month]);

  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">Defaulters</p>
        <h2>Pending Members</h2>
        <p>Members without a payment record for the current month.</p>
      </div>

      <div className="form-grid">
        <div>
          <strong>Total Members:</strong> {membersCount}
        </div>
        <div>
          <strong>Current Month Payments:</strong> {paymentsCount}
        </div>
        <div>
          <strong>Defaulters:</strong> {defaulters.length}
        </div>
      </div>

      {defaulters.length === 0 ? (
        <p>Everyone has paid 🎉</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {defaulters.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>₹{member.monthlyFee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Defaulters;