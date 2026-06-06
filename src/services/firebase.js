import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAu8hHy_AhhMgp-qImggIUbZUMOgw3odIA",
  authDomain: "family-tracker-611f8.firebaseapp.com",
  projectId: "family-tracker-611f8",
  storageBucket: "family-tracker-611f8.firebasestorage.app",
  messagingSenderId: "67470377917",
  appId: "1:67470377917:web:170a7b3c76e487990ac8d4"
};

const app = initializeApp(firebaseConfig);

// Create Firestore instance
const db = getFirestore(app);

export { db };
export default app;