/**
 * Firebase configuration for the Overdrip service.
 * This config is bundled with the CLI and web app.
 *
 * Note: Firebase client config is designed to be public.
 * Security is enforced via Firebase Security Rules, not by hiding these values.
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Returns the Firebase configuration for the Overdrip backend.
 * These values are bundled with the app.
 */
export const getFirebaseConfig = (): FirebaseConfig => {
  return {
    apiKey: "AIzaSyA_jZo1A7-ihS47Gz2sn9JI3wfcoHRo24M",
    authDomain: "overdrip-ed767.firebaseapp.com",
    projectId: "overdrip-ed767",
    storageBucket: "overdrip-ed767.firebasestorage.app",
    messagingSenderId: "516718005369",
    appId: "1:516718005369:web:cbf99f8ef8a9a7742c98a8",
    measurementId: "G-DFQ1DD8Z2F",
  };
};

/**
 * The Cloud Functions URL for the Overdrip backend.
 * Uses emulator if USE_EMULATOR env var is set, otherwise uses production.
 */
export const FUNCTIONS_URL =
  typeof process !== "undefined" && process.env?.USE_EMULATOR === "true"
    ? "http://127.0.0.1:5001/overdrip-ed767/us-central1"
    : "https://us-central1-overdrip-ed767.cloudfunctions.net";
