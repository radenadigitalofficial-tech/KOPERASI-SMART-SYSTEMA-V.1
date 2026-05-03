import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Standard import for the config file provided/generated
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

console.log("Initializing Firebase with Project ID:", firebaseConfig?.projectId);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with long polling enabled for stability in various network environments.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error.code === 'auth/configuration-not-found') {
      console.error(
        "CRITICAL: Firebase Authentication is not fully configured.\n" +
        "1. Go to Firebase Console > Authentication > Sign-in method.\n" +
        "2. Enable 'Google' as a sign-in provider.\n" +
        "3. Ensure the project ID matches: " + firebaseConfig.projectId
      );
      alert("Error: Google Sign-In is not enabled in your Firebase Project configuration. Please check your console settings.");
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.error(
        "CRITICAL: This domain is not authorized for Firebase Auth.\n" +
        "1. Go to Firebase Console > Authentication > Settings > Authorized Domains.\n" +
        "2. Add '" + currentDomain + "' to the list.\n" +
        "3. Also ensure 'localhost' and your Cloud Run domains are listed."
      );
      alert("Error: Unauthorized Domain. Please add '" + currentDomain + "' to your Firebase Authorized Domains list in the Firebase Console.");
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

/**
 * Validates connection to Firestore as required by security guidelines.
 * Added slight delay and clearer logging to help distinguish between
 * transient network issues and configuration errors.
 */
async function testConnection() {
  if (!firebaseConfig || !firebaseConfig.projectId || firebaseConfig.projectId === "missing") return;
  
  try {
    // Attempting to fetch a dummy doc strictly from server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Status: Cloud infrastructure connected successfully.");
  } catch (error: any) {
    // 'unavailable' or 'offline' errors in the preview environment usually mean 
    // the domain needs to be added to Authorized Domains in Firebase.
    if (error.code === 'unavailable' || (error.message && error.message.includes('offline'))) {
      console.warn(
        "Firebase Connectivity Insight: The client reports as 'offline'. \n" +
        "1. Please ensure your current Preview URL is added to 'Authorized Domains' in Firebase console (Authentication > Settings).\n" +
        "2. Current Preview URL: " + window.location.origin
      );
    } else if (error.code === 'permission-denied') {
      console.info("Firebase Status: Connected, but doc 'test/connection' access is restricted (this is expected if rules are locked).");
    } else {
      console.error("Firebase Initialization Error:", error);
    }
  }
}

// Delayed check to allow environment to stabilize
setTimeout(testConnection, 2000);
