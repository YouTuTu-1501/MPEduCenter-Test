import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Khởi tạo Firebase App an toàn (tránh khởi tạo lại nhiều lần)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Khởi tạo Firestore với databaseId chuyên dụng nếu có trong config
export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Khởi tạo Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
