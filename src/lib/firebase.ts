import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Configured dynamically from the provisioned Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyC4Fm_9D1k0Cl4FGvUrxmQR430hkdWmBKo",
  authDomain: "gen-lang-client-0099458857.firebaseapp.com",
  projectId: "gen-lang-client-0099458857",
  storageBucket: "gen-lang-client-0099458857.firebasestorage.app",
  messagingSenderId: "655379720198",
  appId: "1:655379720198:web:82575b2dc3f1039de3bb87"
};

export const FIRESTORE_DATABASE_ID = "ai-studio-nextgenhms-ce5c1ebf-4f57-48ce-a22a-a47f8f54c83a";

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID and multi-tab persistence
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  },
  FIRESTORE_DATABASE_ID
);

// Initialize and export Authentication services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

