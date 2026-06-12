import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBbW-RyAEzIN8C7AFXOUFFv98KMVlMJqDY",
  authDomain: "essay-writing-68f20.firebaseapp.com",
  projectId: "essay-writing-68f20",
  storageBucket: "essay-writing-68f20.firebasestorage.app",
  messagingSenderId: "433154430050",
  appId: "1:433154430050:web:439e8b341d36959d956d3b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);
