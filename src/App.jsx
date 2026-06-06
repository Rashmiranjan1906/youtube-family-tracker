import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./services/auth";
import { getAdminEmail } from "./services/settingsService";
import { getMembers } from "./services/memberService";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Payments from "./pages/Payments";
import MemberAuth from "./pages/MemberAuth";
import MemberHistory from "./pages/MemberHistory";

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [memberHistoryRefreshKey, setMemberHistoryRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoadingAuth(false);
        return;
      }

      const signedEmail = firebaseUser.email || "";
      const adminEmail = await getAdminEmail();

      if (adminEmail && signedEmail.toLowerCase() === adminEmail.toLowerCase()) {
        setUser({ role: "admin", uid: firebaseUser.uid, email: signedEmail });
        setLoadingAuth(false);
        return;
      }

      const members = await getMembers();
      const memberRecord = members.find(
        (member) =>
          member.authUid === firebaseUser.uid ||
          member.email?.toLowerCase() === signedEmail.toLowerCase()
      );

      if (memberRecord) {
        setUser({
          role: "member",
          uid: firebaseUser.uid,
          email: signedEmail,
          name: memberRecord.name,
          memberId: memberRecord.id
        });
      } else {
        setUser(null);
      }

      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loadingAuth) {
    return (
      <div className="app-shell">
        <div className="page-panel">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-choices">
        <div className="auth-choice">
          <Login setLoggedIn={(admin) => setUser({ role: "admin", ...admin })} />
        </div>

        <div className="auth-choice">
          <MemberAuth onMemberLogin={(member) => setUser({ role: "member", ...member })} />
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  // member logged in
  return (
    <div className="app-shell">
      <Payments
        mode="member"
        currentUser={user}
        onLogout={handleLogout}
        onPaymentSaved={() => setMemberHistoryRefreshKey((prev) => prev + 1)}
      />
      <MemberHistory currentUser={user} refreshKey={memberHistoryRefreshKey} />
    </div>
  );
}

export default App;
