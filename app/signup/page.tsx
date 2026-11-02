"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  getFirebaseAuthErrorMessage,
  registerWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";

export default function SignupPage() {
  const router = useRouter();
  const { error: authError } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await registerWithEmail({ displayName, email, password });
      router.replace("/dashboard");
    } catch (error) {
      setMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setBusy(true);
    setMessage(null);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (error) {
      setMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="panel stack">
        <header className="stack" style={{ gap: 6 }}>
          <p style={{ margin: 0, color: "#64748b" }}>MemoCard 智慧閃卡</p>
          <h1 style={{ margin: 0 }}>建立帳號</h1>
          <p style={{ margin: 0, color: "#64748b" }}>你的牌組與複習資料會存放在自己的帳號中。</p>
        </header>

        {authError && <p className="notice" role="alert">{authError}</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            顯示名稱
            <input
              autoComplete="name"
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              value={displayName}
            />
          </label>
          <label className="field">
            電子郵件
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            密碼（至少 8 個字元）
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button className="button" disabled={busy} type="submit">
            {busy ? "處理中…" : "使用電子郵件建立帳號"}
          </button>
        </form>

        <button className="button button-secondary" disabled={busy} onClick={handleGoogleSignIn} type="button">
          使用 Google 繼續
        </button>
        <p style={{ margin: 0 }}>
          已經有帳號？ <Link href="/login">返回登入</Link>
        </p>
      </section>
    </main>
  );
}
