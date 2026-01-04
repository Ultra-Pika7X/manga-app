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

// Check if Firebase is configured
const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
    try {
        app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.warn("Firebase initialization failed:", error);
    }
}

export { app, auth, db, isFirebaseConfigured };
