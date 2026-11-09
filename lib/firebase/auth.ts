import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { z } from "zod";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";

const credentialsSchema = z.object({
  email: z.string().trim().email("請輸入有效的電子郵件地址。"),
  password: z.string().min(8, "密碼至少需要 8 個字元。"),
});

const signUpSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(1, "請輸入顯示名稱。").max(80, "顯示名稱不可超過 80 個字元。"),
});

export async function registerWithEmail(input: {
  displayName: string;
  email: string;
  password: string;
}) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "請檢查註冊資料。");
  }

  const { user } = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    parsed.data.email,
    parsed.data.password,
  );
  await updateProfile(user, { displayName: parsed.data.displayName });
}

export async function signInWithEmail(input: { email: string; password: string }) {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "請檢查登入資料。");
  }

  await signInWithEmailAndPassword(getFirebaseAuth(), parsed.data.email, parsed.data.password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(getFirebaseAuth(), provider);
}

export async function requestPasswordReset(email: string) {
  const parsed = z.string().trim().email("請輸入有效的電子郵件地址。").safeParse(email);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "請輸入有效的電子郵件地址。");
  }

  await sendPasswordResetEmail(getFirebaseAuth(), parsed.data);
}

export async function signOutUser() {
  await signOut(getFirebaseAuth());
}

export async function ensureUserProfile(user: User) {
  const database = getFirestoreDb();
  const profileRef = doc(database, "users", user.uid);
  const displayName = user.displayName?.trim() || "學習者";

  await runTransaction(database, async (transaction) => {
    const profile = await transaction.get(profileRef);
    if (profile.exists()) {
      transaction.update(profileRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
      return;
    }

    transaction.set(profileRef, {
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

export function getFirebaseAuthErrorMessage(error: unknown) {
  if (error instanceof Error && !("code" in error)) {
    return error.message;
  }

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "這個電子郵件已註冊，請直接登入。",
    "auth/invalid-credential": "電子郵件或密碼不正確。",
    "auth/invalid-email": "請輸入有效的電子郵件地址。",
    "auth/operation-not-allowed": "此登入方式尚未在 Firebase 專案中啟用。",
    "auth/popup-blocked": "瀏覽器封鎖了登入視窗，請允許彈出式視窗後再試。",
    "auth/popup-closed-by-user": "登入視窗已關閉，尚未完成登入。",
    "auth/user-not-found": "電子郵件或密碼不正確。",
    "auth/unauthorized-domain": "目前網站網域尚未加入 Firebase 授權網域。",
    "auth/weak-password": "密碼強度不足，請使用至少 8 個字元。",
    "permission-denied": "資料存取遭拒，請確認 Firestore 安全規則已部署。",
    "firestore/permission-denied": "資料存取遭拒，請確認 Firestore 安全規則已部署。",
    unavailable: "目前無法連線到資料庫，請稍後再試。",
    "firestore/unavailable": "目前無法連線到資料庫，請稍後再試。",
  };

  return messages[code] ?? "操作未完成，請確認 Firebase 設定與網路連線後再試。";
}
