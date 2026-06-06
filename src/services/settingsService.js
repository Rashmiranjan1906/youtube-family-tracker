import { db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

const SETTINGS_DOC = doc(db, "settings", "payment");

export const setUpiId = async (upiId) => {
  await setDoc(SETTINGS_DOC, { upiId }, { merge: true });
};

export const getUpiId = async () => {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return "";
  const data = snap.data();
  return data.upiId || "";
};

export const setAdminEmail = async (email) => {
  await setDoc(SETTINGS_DOC, { adminEmail: email }, { merge: true });
};

export const getAdminEmail = async () => {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) return "";
  const data = snap.data();
  return data.adminEmail || "";
};

export default { setUpiId, getUpiId, setAdminEmail, getAdminEmail };
