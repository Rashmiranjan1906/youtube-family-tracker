import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { getAdminEmail } from "../services/settingsService";

function Login({ setLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Ensure this user matches configured admin email
      const adminEmail = await getAdminEmail();
      const signedEmail = userCredential.user.email || "";

      if (adminEmail && signedEmail.toLowerCase() !== adminEmail.toLowerCase()) {
        await signOut(auth);
        alert("This account is not authorized for Admin access.");
        return;
      }

      // pass admin identity back to App
      setLoggedIn({ uid: userCredential.user.uid, email: signedEmail });
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="app-shell page-panel auth-panel">
      <div className="panel-header">
        <p className="eyebrow">Admin Access</p>
        <h2>Welcome Back</h2>
        <p>Sign in to manage members, payments, reminders, and defaulters.</p>
      </div>

      <div className="form-grid">
        <label className="input-label">Email</label>
        <input
          className="input-field"
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="input-label">Password</label>
        <input
          className="input-field"
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="primary-button" onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );
}

export default Login;