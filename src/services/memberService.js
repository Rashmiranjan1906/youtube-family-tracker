import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs
} from "firebase/firestore";

export const addMember = async (member) => {
  const docRef = await addDoc(
    collection(db, "members"),
    member
  );

  return docRef.id;
};

export const getMembers = async () => {
  const querySnapshot = await getDocs(
    collection(db, "members")
  );

  const members = [];

  querySnapshot.forEach((doc) => {
    members.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return members;
};