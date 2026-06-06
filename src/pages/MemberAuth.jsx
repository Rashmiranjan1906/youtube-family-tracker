import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { addMember, getMembers } from "../services/memberService";

function MemberAuth({ onMemberLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!name || !phone || !email || !password) return alert("Fill all fields");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // create member record
      await addMember({
        authUid: cred.user.uid,
        name,
        phone,
        email,
        monthlyFee: 50,
        active: true
      });
      await signOut(auth);
      alert("Account created successfully. Please log in to continue.");
      setIsSignup(false);
      setPassword("");
    } catch (err) {
      alert("Invalid username/password");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert("Fill email & password");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const members = await getMembers();
      const memberRecord = members.find(
        (member) => member.authUid === cred.user.uid || member.email?.toLowerCase() === email.toLowerCase()
      );
      onMemberLogin({
        uid: cred.user.uid,
        email: cred.user.email,
        name: memberRecord?.name,
        memberId: memberRecord?.id
      });
    } catch (err) {
      alert("Invalid username/password");
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

            <label className="input-label">Phone Number</label>
            <input className="input-field" type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Enter your phone number" />
          </>
        )}

        <label className="input-label">Email</label>
        <input className="input-field" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />

        <label className="input-label">Password</label>
        <input className="input-field" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />

        {isSignup ? (
          <button className="primary-button" onClick={handleSignup}>Create Account</button>
        ) : (
          <>
            <button className="primary-button" onClick={handleLogin}>Login</button>
          </>
        )}

        <button className="secondary-button" onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Have an account? Login" : "New member? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default MemberAuth;
