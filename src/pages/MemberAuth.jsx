import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { addMember } from "../services/memberService";

function MemberAuth({ onMemberLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!name || !email || !password) return alert("Fill all fields");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // create member record
      await addMember({
        authUid: cred.user.uid,
        name,
        email,
        monthlyFee: 50,
        active: true
      });
      onMemberLogin({ uid: cred.user.uid, email: cred.user.email, name });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert("Fill email & password");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      onMemberLogin({ uid: cred.user.uid, email: cred.user.email });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="app-shell page-panel auth-panel">
      <div className="panel-header">
        <p className="eyebrow">Member Portal</p>
        <h2>{isSignup ? "Sign Up" : "Member Login"}</h2>
        <p>{isSignup ? "Create an account to submit payments." : "Login to view your payments and submit receipts."}</p>
      </div>

      <div className="form-grid">
        {isSignup && (
          <>
            <label className="input-label">Full Name</label>
            <input className="input-field" value={name} onChange={(e)=>setName(e.target.value)} />
          </>
        )}

        <label className="input-label">Email</label>
        <input className="input-field" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />

        <label className="input-label">Password</label>
        <input className="input-field" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

        {isSignup ? (
          <button className="primary-button" onClick={handleSignup}>Create Account</button>
        ) : (
          <button className="primary-button" onClick={handleLogin}>Login</button>
        )}

        <button className="secondary-button" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Have an account? Login" : "New member? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default MemberAuth;
