import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase Web configuration.
 *
 * Firebase Web API keys are public identifiers by design. Security is enforced
 * by Firebase Authentication, Firestore Security Rules, and (later) App Check.
 *
 * Do not put service-account private keys or other server secrets in this file.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBSmHBsKOBChOGbLd9HhOTHp4oW4IlzSzo",
  authDomain: "accounting-assistant-d291a.firebaseapp.com",
  projectId: "accounting-assistant-d291a",
  storageBucket: "accounting-assistant-d291a.firebasestorage.app",
  messagingSenderId: "880964968010",
  appId: "1:880964968010:web:e5071553bf27c4614c50b3",
} as const;

export const firebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);
