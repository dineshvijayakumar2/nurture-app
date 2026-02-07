
// Initialize Firebase modular SDK
// Fixed: Using named imports for modular SDK compatibility
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyChh3SxhxxYp3fUvGDRdpWfuaykEd8syBI",
  authDomain: "nurture-app-68b23.firebaseapp.com",
  projectId: "nurture-app-68b23",
  storageBucket: "nurture-app-68b23.firebasestorage.app",
  messagingSenderId: "6025175454",
  appId: "1:6025175454:web:c4e418794f4f89c311368f",
  measurementId: "G-7K44J5EPP1"
};

// Fixed: Correct call to initializeApp from modular SDK
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
