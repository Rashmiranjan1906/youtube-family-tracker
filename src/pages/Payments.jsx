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

function Payments({ mode = "admin", onBack, onLogout, onPaymentSaved, currentUser }) {

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

  const memberDisplayName = currentUser?.name || currentUser?.email?.split("@")[0] || "Member";

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
      <div className="page-panel">
        <div className="panel-header">
          <p className="eyebrow">Payment Portal</p>
          <h2>💳 Make Payment</h2>
          <p>Hi {memberDisplayName}, welcome to YouTube Premium payment.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px" }}>
            {onBack && (
              <button
                className="secondary-button"
                onClick={onBack}
                style={{ marginTop: "0" }}
              >
                ← Back to Admin
              </button>
            )}
            {onLogout && (
              <button
                className="secondary-button"
                onClick={onLogout}
                style={{ marginTop: "0" }}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="form-grid">
          {step === "enter-details" && (
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

          {mode === "member" && (
            <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 12 }}>
              <h3>Change Password</h3>
              <label className="input-label">New Password</label>
              <input className="input-field" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <label className="input-label">Confirm Password</label>
              <input className="input-field" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
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
                      alert("Password updated successfully");
                      setNewPassword("");
                      setConfirmPassword("");
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
            </div>
          )}

          {step === "payment-screenshot" && (
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
