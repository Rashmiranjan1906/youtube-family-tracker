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
import { logActivity } from "./services/auditService";

function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState("admin");
  const [memberHistoryRefreshKey, setMemberHistoryRefreshKey] = useState(0);
  const [memberPasswordOpen, setMemberPasswordOpen] = useState(false);

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
    if (user) {
      await logActivity({
        actorRole: user.role,
        actorUid: user.uid,
        actorEmail: user.email,
        action: `${user.role}_logout`
      });
    }
    await signOut(auth);
    setUser(null);
    setMemberPasswordOpen(false);
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
      <div className="auth-page">
        <section className="auth-hero">
          <p className="eyebrow">YouTube Premium Family</p>
          <h1>Family Tracker</h1>
          <p className="subtitle">
            Keep members, dues, receipts, and reminders in one clean place.
          </p>
          <div className="auth-highlights">
            <span>Monthly dues</span>
            <span>Payment history</span>
            <span>Member portal</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-tabs" aria-label="Choose login type">
            <button
              className={authMode === "admin" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("admin")}
            >
              Admin
            </button>
            <button
              className={authMode === "member" ? "active" : ""}
              type="button"
              onClick={() => setAuthMode("member")}
            >
              Member
            </button>
          </div>

          <div className="auth-content">
            {authMode === "admin" ? (
              <Login
                embedded
                setLoggedIn={(admin) => setUser({ role: "admin", ...admin })}
              />
            ) : (
              <MemberAuth
                embedded
                onMemberLogin={(member) => setUser({ role: "member", ...member })}
              />
            )}
          </div>
        </section>
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
        onPasswordPanelChange={setMemberPasswordOpen}
        onPaymentSaved={() => setMemberHistoryRefreshKey((prev) => prev + 1)}
      />
      {!memberPasswordOpen && (
        <MemberHistory currentUser={user} refreshKey={memberHistoryRefreshKey} />
      )}
    </div>
  );
}

export default App;
