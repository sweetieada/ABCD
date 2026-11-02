import { getApp, getApps, initializeApp } from "firebase/app";
import type { FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

function getFirebaseApp() {
  if (typeof window === "undefined") {
    throw new Error("Firebase client services are only available in the browser.");
  }

  const config: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? (useEmulators ? "demo-api-key" : ""),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? (useEmulators ? "localhost" : ""),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (useEmulators ? "demo-memocard" : ""),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? (useEmulators ? "demo-memocard-app" : ""),
  };
  const missing = Object.entries(config)
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Firebase 設定尚未完成：${missing.join(", ")}`);
  }

  return getApps().length > 0 ? getApp() : initializeApp(config);
}

function getEmulatorHost() {
  const hostname = window.location.hostname;
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error("Firebase Emulator 只允許透過 localhost 開發環境連線。");
  }
  return "127.0.0.1";
}

let authInstance: ReturnType<typeof getAuth> | undefined;
let firestoreInstance: ReturnType<typeof getFirestore> | undefined;

export function getFirebaseAuth() {
  if (authInstance) return authInstance;

  authInstance = getAuth(getFirebaseApp());
  if (useEmulators) {
    connectAuthEmulator(authInstance, `http://${getEmulatorHost()}:9099`, {
      disableWarnings: true,
    });
  }
  return authInstance;
}

export function getFirestoreDb() {
  if (firestoreInstance) return firestoreInstance;

  firestoreInstance = getFirestore(getFirebaseApp());
  if (useEmulators) {
    connectFirestoreEmulator(firestoreInstance, getEmulatorHost(), 8080);
  }
  return firestoreInstance;
}
