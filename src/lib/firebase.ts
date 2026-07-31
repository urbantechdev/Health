import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configured dynamically from the provisioned Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4Fm_9D1k0Cl4FGvUrxmQR430hkdWmBKo",
  authDomain: "gen-lang-client-0099458857.firebaseapp.com",
  projectId: "gen-lang-client-0099458857",
  storageBucket: "gen-lang-client-0099458857.firebasestorage.app",
  messagingSenderId: "655379720198",
  appId: "1:655379720198:web:82575b2dc3f1039de3bb87"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust multi-tab offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize and export Authentication services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

