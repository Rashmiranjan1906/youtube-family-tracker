import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export const addPayment = async (payment) => {
  const docRef = await addDoc(
    collection(db, "payments"),
    payment
  );

  return docRef.id;
};

export const getPayments = async () => {

  const q = query(
    collection(db, "payments"),
    orderBy("paymentDate", "desc")
  );

  const snapshot = await getDocs(q);

  const payments = [];

  snapshot.forEach((doc) => {
    payments.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return payments;
};

export const getPaymentsByMonth = async (month) => {
  if (!month) {
    return await getPayments();
  }

  const payments = await getPayments();
  return payments.filter((payment) => payment.month === month);
};

export const updatePayment = async (paymentId, changes) => {
  const paymentRef = doc(db, "payments", paymentId);
  await updateDoc(paymentRef, changes);
};

export const deletePayment = async (paymentId) => {
  const paymentRef = doc(db, "payments", paymentId);
  await deleteDoc(paymentRef);
};

export const getCurrentMonthPayments = async () => {

  const currentMonth = new Date().toISOString().slice(0, 7);
  return await getPaymentsByMonth(currentMonth);
};