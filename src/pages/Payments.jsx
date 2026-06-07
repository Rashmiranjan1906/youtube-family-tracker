import { useState, useEffect } from "react";
import { addPayment } from "../services/paymentService";
import { getMembers } from "../services/memberService";
import {
  generatePaymentQR,
  validateScreenshot,
  convertFileToBase64
} from "../services/razorpayService";
import { getUpiId } from "../services/settingsService";
import { auth } from "../services/auth";
import { updatePassword } from "firebase/auth";
import { logActivity } from "../services/auditService";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/HSRsCFX17pFJBncSvfr5CH";
const CONTACT_EMAIL = "rashmiranjanbarik962@gmail.com";
const CONTACT_PHONE = "+91 7205300237";

function Payments({ mode = "admin", onBack, onLogout, onPaymentSaved, onPasswordPanelChange, currentUser }) {

  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [amount, setAmount] = useState(50);
  const [transactionId, setTransactionId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qr");
  const [processing, setProcessing] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [step, setStep] = useState(mode === "member" ? "enter-details" : "initial");

  // change password state (member)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showMemberPasswordForm, setShowMemberPasswordForm] = useState(false);

  const memberDisplayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Member";

  const toggleMemberPasswordForm = () => {
    setShowMemberPasswordForm((show) => {
      const next = !show;
      onPasswordPanelChange?.(next);
      return next;
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMembers();
        setMembers(data);

        // If a currentUser exists, try to map to a member record
        if (currentUser && currentUser.uid) {
          const found = data.find((m) => m.authUid === currentUser.uid || m.id === currentUser.uid);
          if (found) {
            setSelectedMember(found.id);
            setMemberName(found.name);
          } else if (currentUser.name) {
            setMemberName(currentUser.name);
          }
        }

        // always load admin UPI for member mode
        const upi = await getUpiId();
        setUpiId(upi || "");
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    load();
  }, [mode, currentUser]);

  const generateQRCode = async () => {
    if (mode === "admin") {
      if (!selectedMember || !amount || !upiId.trim()) {
        alert("Please fill in all fields");
        return;
      }
    } else {
      if (!amount || !upiId.trim()) {
        alert("Please fill in all fields");
        return;
      }
    }

    setProcessing(true);

    try {
      const memberInfo = mode === "admin" 
        ? members.find((m) => m.id === selectedMember)
        : { name: memberName };
      
      const transactionRef = `TXN_${Date.now()}`;

      const qrResult = await generatePaymentQR(
        upiId,
        "YouTube Family",
        amount,
        transactionRef
      );

      if (qrResult.isValid) {
        setQrCode({
          ...qrResult,
          transactionRef,
          memberName: memberInfo.name
        });
        setStep("payment-screenshot");
      } else {
        alert("Failed to generate QR code: " + qrResult.error);
      }
    } catch (error) {
      console.error("Error generating QR:", error);
      alert("Failed to generate QR code");
    } finally {
      setProcessing(false);
    }
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const validation = validateScreenshot(file);

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setScreenshotFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const submitQRPayment = async () => {
    if (!screenshotFile) {
      alert("Please upload a payment screenshot");
      return;
    }

    // Transaction ID optional for members
    if (mode === "admin" && !transactionId.trim()) {
      alert("Please enter the transaction ID from the screenshot");
      return;
    }

    setProcessing(true);

    try {
      let member;
      if (mode === "admin") {
        member = members.find((m) => m.id === selectedMember);
      } else {
        member = members.find((m) => m.authUid === currentUser?.uid) || members.find((m) => m.id === selectedMember);
        if (!member) {
          member = { id: currentUser?.uid || `member_${Date.now()}`, name: memberName || currentUser?.email };
        }
      }

      const screenshotBase64 = await convertFileToBase64(screenshotFile);

      await addPayment({
        memberId: member.id,
        authUid: member.authUid || currentUser?.uid,
        memberName: member.name,
        amount: Number(amount),
        transactionId,
        month: new Date().toISOString().slice(0, 7),
        status: "Paid",
        paymentDate: new Date().toISOString(),
        paymentGateway: "qr_upi",
        screenshotData: screenshotBase64,
        screenshotFileName: screenshotFile.name,
        qrReference: qrCode?.transactionRef
      });
      await logActivity({
        actorRole: mode,
        actorUid: currentUser?.uid,
        actorEmail: currentUser?.email,
        action: `${mode}_record_qr_payment`,
        details: {
          memberId: member.id,
          memberName: member.name,
          amount: Number(amount),
          month: new Date().toISOString().slice(0, 7)
        }
      });

      alert("Payment recorded successfully! ✨");
      onPaymentSaved?.();

      // Reset form
      if (mode === "member") {
        setMemberName("");
        setAmount(50);
        setTransactionId("");
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setQrCode(null);
        setStep("enter-details");
      } else {
        setSelectedMember("");
        setAmount(50);
        setTransactionId("");
        setUpiId("");
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setQrCode(null);
        setStep("initial");
      }
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment");
    } finally {
      setProcessing(false);
    }
  };

  const savePaymentManually = async () => {
    if (mode === "admin" && !selectedMember) {
      alert("Please select a member");
      return;
    }

    // transactionId optional for members
    if (mode === "admin" && !transactionId.trim()) {
      alert("Please enter a transaction ID");
      return;
    }

    setProcessing(true);

    try {
      let member;
      if (mode === "admin") {
        member = members.find((m) => m.id === selectedMember);
      } else {
        member = members.find((m) => m.authUid === currentUser?.uid) || members.find((m) => m.id === selectedMember);
        if (!member) {
          member = { id: currentUser?.uid || `member_${Date.now()}`, name: memberName || currentUser?.email };
        }
      }

      await addPayment({
        memberId: member.id,
        authUid: member.authUid || currentUser?.uid,
        memberName: member.name,
        amount: Number(amount),
        transactionId,
        month: new Date().toISOString().slice(0, 7),
        status: "Paid",
        paymentDate: new Date().toISOString(),
        paymentGateway: "manual"
      });
      await logActivity({
        actorRole: mode,
        actorUid: currentUser?.uid,
        actorEmail: currentUser?.email,
        action: `${mode}_record_manual_payment`,
        details: {
          memberId: member.id,
          memberName: member.name,
          amount: Number(amount),
          month: new Date().toISOString().slice(0, 7)
        }
      });

      alert("Payment Saved");
      onPaymentSaved?.();

      if (mode === "member") {
        setMemberName("");
        setAmount(50);
        setTransactionId("");
        setStep("enter-details");
      } else {
        setSelectedMember("");
        setAmount(50);
        setTransactionId("");
        setStep("initial");
      }

    } catch (error) {
      console.error(error);
      alert("Failed to save payment");
    } finally {
      setProcessing(false);
    }
  };

  // ============ MEMBER MODE ============
  if (mode === "member") {
    return (
      <div className="page-panel member-portal">
        <div className="member-portal-top">
          <div className="member-title-row">
            <div className="youtube-mark" aria-hidden="true">
              <span></span>
            </div>
            <div>
              <p className="eyebrow">Payment Portal</p>
              <h2>YouTube Premium</h2>
              <p>Hi {memberDisplayName}, manage your family plan payment here.</p>
            </div>
          </div>

          <nav className="member-nav" aria-label="Member actions">
            <button
              className="secondary-button"
              onClick={toggleMemberPasswordForm}
            >
              {showMemberPasswordForm ? "Back to Payment" : "Change Password"}
            </button>
            <a
              className="secondary-button nav-link-button whatsapp-button"
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp Group
            </a>
            {onBack && (
              <button
                className="secondary-button"
                onClick={onBack}
              >
                ← Back to Admin
              </button>
            )}
            {onLogout && (
              <button
                className="secondary-button"
                onClick={onLogout}
              >
                Logout
              </button>
            )}
          </nav>
        </div>

        <div className="form-grid">
          {mode === "member" && showMemberPasswordForm ? (
            <div className="password-focus-panel">
              <h3>Change Password</h3>
              <label className="input-label">New Password</label>
              <input className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <label className="input-label">Confirm Password</label>
              <input className="input-field" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button
                className="primary-button"
                onClick={async () => {
                  if (!newPassword || !confirmPassword) return alert("Fill both password fields");
                  if (newPassword !== confirmPassword) return alert("Passwords do not match");
                  if (newPassword.length < 6) return alert("Password should be at least 6 characters");

                  const currentUser = auth.currentUser;
                  if (!currentUser) return alert("Member does not exist");

                  try {
                    await updatePassword(currentUser, newPassword);
                    await logActivity({
                      actorRole: "member",
                      actorUid: currentUser.uid,
                      actorEmail: currentUser.email,
                      action: "member_update_password"
                    });
                    alert("Password updated successfully");
                    setNewPassword("");
                    setConfirmPassword("");
                    setShowMemberPasswordForm(false);
                    onPasswordPanelChange?.(false);
                  } catch (err) {
                    console.error(err);
                    if (err.code === "auth/requires-recent-login") {
                      alert("Please re-login and try again");
                    } else {
                      alert("Failed to update password");
                    }
                  }
                }}
              >
                Update Password
              </button>
            </div>
          ) : step === "enter-details" && (
            <>
              <label className="input-label">Your Name</label>
              <input
                className="input-field"
                placeholder="Enter your full name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                disabled={processing}
                readOnly={mode === "member"}
              />

              <label className="input-label">Amount to Pay (₹)</label>
              <input
                className="input-field"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={processing}
              />

              <label className="input-label">Admin's UPI ID</label>
              <input
                className="input-field"
                placeholder="e.g., admin@upi"
                value={upiId}
                readOnly
                disabled
              />

              {!upiId ? (
                <p style={{ color: "#c44", fontSize: "0.95rem" }}>
                  Admin has not set a UPI ID yet. Please contact the admin.
                </p>
              ) : (
                <button
                  className="primary-button"
                  onClick={generateQRCode}
                  disabled={processing || !memberName.trim()}
                >
                  {processing ? "Generating QR..." : "📱 Generate Payment QR"}
                </button>
              )}
            </>
          )}

          {!showMemberPasswordForm && step === "payment-screenshot" && (
            <>
              <div className="qr-container">
                <div className="qr-box">
                  <img src={qrCode.qrCodeUrl} alt="Payment QR Code" className="qr-image" />
                  <p className="qr-text">
                    Scan with any UPI app to pay ₹{amount}
                  </p>
                  <p style={{ marginTop: "8px", fontSize: "0.85rem", color: "#999" }}>
                    ✓ Scan the QR code above to make your payment
                  </p>
                </div>
              </div>

              <div className="screenshot-section">
                <p className="payment-info">
                  ✅ Payment Completed? Upload your receipt below
                </p>

                <label className="input-label">Transaction ID (UTR)</label>
                <input
                  className="input-field"
                  placeholder="Enter UPI Reference ID from your receipt"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  disabled={processing}
                />

                <label className="input-label">Payment Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  disabled={processing}
                  className="file-input"
                />

                {screenshotPreview && (
                  <div className="screenshot-preview">
                    <img src={screenshotPreview} alt="Payment Screenshot Preview" />
                    <p className="preview-text">✓ Screenshot ready to submit</p>
                  </div>
                )}

                <button
                  className="primary-button"
                  onClick={submitQRPayment}
                  disabled={processing || !screenshotFile}
                >
                  {processing ? "Submitting..." : "✨ Submit Payment"}
                </button>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setQrCode(null);
                    setTransactionId("");
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                    setStep("enter-details");
                  }}
                  disabled={processing}
                >
                  ← Generate Different QR
                </button>
              </div>
            </>
          )}
        </div>

        {!showMemberPasswordForm && (
          <>
            <div className="member-support-grid">
              <section className="support-card">
                <p className="eyebrow">Need Help?</p>
                <h3>Contact Support</h3>
                <p>For any issue with payment, login, or account access.</p>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                <a href="tel:+917205300237">{CONTACT_PHONE}</a>
              </section>

              <section className="support-card">
                <p className="eyebrow">Visit My Page</p>
                <h3>Connect Online</h3>
                <div className="social-links">
                  <a href="https://www.instagram.com/iamrashmiranjan/" target="_blank" rel="noreferrer">Instagram</a>
                  <a href="https://www.linkedin.com/in/rashmiranjan-barik-85bb69204" target="_blank" rel="noreferrer">LinkedIn</a>
                  <a href="https://www.facebook.com/rashmiranjanbarik.kanha/" target="_blank" rel="noreferrer">Facebook</a>
                  <a href="https://github.com/Rashmiranjan1906/youtube-family-tracker.git" target="_blank" rel="noreferrer">GitHub</a>
                </div>
              </section>
            </div>

            <div className="payment-note">
          <p>
            <strong>How to pay:</strong> 
            <br/>1️⃣ Enter your details above
            <br/>2️⃣ Generate the payment QR code
            <br/>3️⃣ Scan using any UPI app (Google Pay, PhonePe, etc.)
            <br/>4️⃣ Complete the payment
            <br/>5️⃣ Upload the receipt screenshot
            <br/>6️⃣ Done! Your payment will be recorded ✅
          </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // ============ ADMIN MODE ============
  return (
    <div className="page-panel">
      <div className="panel-header">
        <p className="eyebrow">Payments</p>
        <h2>Record Payment</h2>
        <p>Manage member payments and generate QR codes for payment collection.</p>
      </div>

      <div className="form-grid">
        <label className="input-label">Member</label>
        <select
          className="input-field"
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          disabled={processing || qrCode}
        >
          <option value="">Select Member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <label className="input-label">Amount (₹)</label>
        <input
          className="input-field"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={processing || qrCode}
        />

        <label className="input-label">Payment Method</label>
        <div className="payment-method-toggle">
          <button
            className={`method-button ${paymentMethod === "qr" ? "active" : ""}`}
            onClick={() => setPaymentMethod("qr")}
            disabled={processing}
          >
            📱 UPI QR Code
          </button>
          <button
            className={`method-button ${paymentMethod === "manual" ? "active" : ""}`}
            onClick={() => setPaymentMethod("manual")}
            disabled={processing}
          >
            📝 Manual Entry
          </button>
        </div>

        {paymentMethod === "qr" && (
          <>
            {!qrCode ? (
              <>
                {mode === "admin" ? (
                  <>
                    <label className="input-label">Your UPI ID (for QR)</label>
                    <input
                      className="input-field"
                      placeholder="e.g., yourname@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={processing}
                    />

                    <button
                      className="primary-button"
                      onClick={generateQRCode}
                      disabled={processing}
                    >
                      {processing ? "Generating..." : "Generate Payment QR"}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="payment-info">Scan the admin QR shown below to pay the requested amount.</p>
                    <button
                      className="primary-button"
                      onClick={generateQRCode}
                      disabled={processing || !upiId}
                    >
                      {processing ? "Generating..." : "Show Admin QR"}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="qr-container">
                  <div className="qr-box">
                    <img src={qrCode.qrCodeUrl} alt="Payment QR Code" className="qr-image" />
                    <p className="qr-text">Scan with any UPI app or send ₹{amount}</p>
                  </div>
                </div>

                <div className="screenshot-section">
                  <p className="payment-info">
                    📸 After payment, upload the transaction screenshot below
                  </p>

                  <label className="input-label">Transaction ID</label>
                  <input
                    className="input-field"
                    placeholder="Enter UPI Ref ID (UTR) from screenshot"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    disabled={processing}
                  />

                  <label className="input-label">Payment Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    disabled={processing}
                    className="file-input"
                  />

                  {screenshotPreview && (
                    <div className="screenshot-preview">
                      <img src={screenshotPreview} alt="Payment Screenshot Preview" />
                      <p className="preview-text">✓ Screenshot loaded</p>
                    </div>
                  )}

                  <button
                    className="primary-button"
                    onClick={submitQRPayment}
                    disabled={processing || !screenshotFile}
                  >
                    {processing ? "Submitting..." : "Confirm Payment"}
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => {
                      setQrCode(null);
                      setTransactionId("");
                      setScreenshotFile(null);
                      setScreenshotPreview(null);
                    }}
                    disabled={processing}
                  >
                    ← Generate Different QR
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {paymentMethod === "manual" && (
          <>
            <label className="input-label">Transaction ID</label>
            <input
              className="input-field"
              placeholder="UPI Reference / Transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              disabled={processing}
            />

            <button
              className="primary-button"
              onClick={savePaymentManually}
              disabled={processing}
            >
              {processing ? "Saving..." : "Save Manual Payment"}
            </button>
          </>
        )}
      </div>

      <div className="payment-note">
        <p>
          <strong>Admin Workflow:</strong> 
          <br/>1️⃣ Select member and amount
          <br/>2️⃣ Generate UPI QR code
          <br/>3️⃣ Share QR code with member
          <br/>4️⃣ Member scans and pays
          <br/>5️⃣ Upload payment screenshot
          <br/>6️⃣ Payment recorded ✨
        </p>
      </div>
    </div>
  );
}

export default Payments;
