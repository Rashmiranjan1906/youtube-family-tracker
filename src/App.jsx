import { useState } from "react";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import Payments from "./pages/Payments";
import MemberAuth from "./pages/MemberAuth";
import MemberHistory from "./pages/MemberHistory";

function App() {
  // user: null | { role: 'admin'|'member', uid, email, name }
  const [user, setUser] = useState(null);
  const handleMemberLogout = () => setUser(null);

  if (!user) {
    // show admin login and member auth side-by-side (equal columns)
    return (
      <div className="auth-choices">
        <div style={{ width: "48%" }}>
          <Login setLoggedIn={(admin) => setUser({ role: "admin", ...admin })} />
        </div>

        <div style={{ width: "48%" }}>
          <MemberAuth onMemberLogin={(member) => setUser({ role: "member", ...member })} />
        </div>
      </div>
    );
  }

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  // member logged in
  return (
    <div className="app-shell">
      <Payments mode="member" currentUser={user} onLogout={handleMemberLogout} />
      <MemberHistory currentUser={user} />
    </div>
  );
}

export default App;