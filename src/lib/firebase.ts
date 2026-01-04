import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA9qvioTG03GzcT02v-_EVPM-sWGIToX0k",
    authDomain: "manga-reader-5b570.firebaseapp.com",
    projectId: "manga-reader-5b570",
    storageBucket: "manga-reader-5b570.firebasestorage.app",
    messagingSenderId: "462196168770",
    appId: "1:462196168770:web:8790cccd8af9b56f7835db"
};

// Initialize Firebase directly since we have the config
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const isFirebaseConfigured = true;

export { app, auth, db, isFirebaseConfigured };
