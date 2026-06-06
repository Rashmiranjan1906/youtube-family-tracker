// QR Code Payment Service
// Users pay via UPI to the provided QR code and submit transaction screenshot

import QRCode from "qrcode";

export const generatePaymentQR = async (
  upiId,
  payeeName,
  amount,
  transactionRef
) => {
  try {
    // UPI Deep Link Format: upi://pay?pa=upiid&pn=name&am=amount&tn=description
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
      payeeName
    )}&am=${amount}&tn=YouTube%20Premium%20Payment&tr=${transactionRef}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(upiLink, {
      width: 300,
      margin: 2,
      color: {
        dark: "#6d28d9",
        light: "#ffffff"
      }
    });

    return {
      qrCodeUrl: qrCodeDataUrl,
      upiLink,
      isValid: true
    };
  } catch (error) {
    console.error("Error generating QR code:", error);
    return {
      qrCodeUrl: null,
      upiLink: null,
      isValid: false,
      error: error.message
    };
  }
};

export const validateScreenshot = (file) => {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Please upload a valid image (JPEG, PNG, or WebP)"
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Image size must be less than 5MB"
    };
  }

  return {
    valid: true,
    error: null
  };
};

export const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
