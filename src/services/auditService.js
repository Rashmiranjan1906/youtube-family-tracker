import { db } from "./firebase";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

export const logActivity = async ({
  actorRole,
  actorUid,
  actorEmail,
  action,
  details = {}
}) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      actorRole,
      actorUid: actorUid || null,
      actorEmail: actorEmail || null,
      action,
      details,
      createdAt: serverTimestamp(),
      clientTime: new Date().toISOString()
    });
  } catch (error) {
    console.warn("Activity log failed", error);
  }
};

export const getActivityLogs = async (maxLogs = 100) => {
  const q = query(
    collection(db, "activityLogs"),
    orderBy("clientTime", "desc"),
    limit(maxLogs)
  );
  const snapshot = await getDocs(q);
  const logs = [];

  snapshot.forEach((doc) => {
    logs.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return logs;
};
