import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAs2Es86CTF16SpDDNm74up54V3WSLq3uA",
  authDomain: "propsitos.firebaseapp.com",
  projectId: "propsitos",
  storageBucket: "propsitos.appspot.com",
  messagingSenderId: "846204544374",
  appId: "1:846204544374:web:60c6be1494e0bd5cf4c657"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
