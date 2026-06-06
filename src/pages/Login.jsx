import { useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { getAdminEmail } from "../services/settingsService";
import { isValidEmail } from "../utils/validation";

function Login({ setLoggedIn, embedded = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return alert("Fill email & password");
    if (!isValidEmail(email)) return alert("Please enter a valid email address");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);

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
    } catch {
      alert("Invalid username/password");
    }
  };

  

  const content = (
    <>
      <div className="panel-header">
        <p className="eyebrow">Admin Access</p>
        <h2>Admin Login</h2>
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
    </>
  );

  if (embedded) {
    return <div className="auth-form-content">{content}</div>;
  }

  return (
    <div className="app-shell page-panel auth-panel">
      {content}
    </div>
  );
}

export default Login;
