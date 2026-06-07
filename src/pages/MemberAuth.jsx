import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "../services/auth";
import { addMember, getMembers } from "../services/memberService";
import { logActivity } from "../services/auditService";
import { isValidEmail, isValidPhone } from "../utils/validation";

function MemberAuth({ onMemberLogin, embedded = false }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!name || !phone || !email || !password) return alert("Fill all fields");
    if (!isValidPhone(phone)) return alert("Please enter a valid phone number");
    if (!isValidEmail(email)) return alert("Please enter a valid email address");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // create member record
      const memberId = await addMember({
        authUid: cred.user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        monthlyFee: 50,
        active: true
      });
      await logActivity({
        actorRole: "member",
        actorUid: cred.user.uid,
        actorEmail: email.trim(),
        action: "member_signup",
        details: { memberId, memberName: name.trim() }
      });
      await signOut(auth);
      alert("Account created successfully. Please log in to continue.");
      setIsSignup(false);
      setPassword("");
    } catch {
      alert("Invalid username/password");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert("Fill email & password");
    if (!isValidEmail(email)) return alert("Please enter a valid email address");

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const members = await getMembers();
      const memberRecord = members.find(
        (member) => member.authUid === cred.user.uid || member.email?.toLowerCase() === email.trim().toLowerCase()
      );
      await logActivity({
        actorRole: "member",
        actorUid: cred.user.uid,
        actorEmail: cred.user.email,
        action: "member_login",
        details: { memberId: memberRecord?.id || null, memberName: memberRecord?.name || null }
      });
      onMemberLogin({
        uid: cred.user.uid,
        email: cred.user.email,
        name: memberRecord?.name,
        memberId: memberRecord?.id
      });
    } catch {
      alert("Invalid username/password");
    }
  };

  

  const content = (
    <>
      <div className="panel-header member-auth-header">
        <div className="youtube-mark" aria-hidden="true">
          <span></span>
        </div>
        <p className="eyebrow">YouTube Premium Member</p>
        <h2>{isSignup ? "Create your member account" : "Welcome back"}</h2>
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

export default MemberAuth;
