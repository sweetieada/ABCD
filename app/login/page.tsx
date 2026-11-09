"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  getFirebaseAuthErrorMessage,
  requestPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await signInWithEmail({ email, password });
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

  async function handlePasswordReset() {
    setBusy(true);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage("如果這個電子郵件已註冊，系統會寄送重設密碼的連結。");
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
          <h1 style={{ margin: 0 }}>登入</h1>
          <p style={{ margin: 0, color: "#64748b" }}>登入後管理你的牌組與複習進度。</p>
        </header>

        {authError && <p className="notice" role="alert">{authError}</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <form className="stack" onSubmit={handleEmailSignIn}>
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
            密碼
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button className="button" disabled={busy} type="submit">
            {busy ? "處理中…" : "使用電子郵件登入"}
          </button>
        </form>

        <button className="button button-secondary" disabled={busy} onClick={handleGoogleSignIn} type="button">
          使用 Google 登入
        </button>
        <button className="button button-secondary" disabled={busy} onClick={handlePasswordReset} type="button">
          忘記密碼
        </button>
        <p style={{ margin: 0 }}>
          還沒有帳號？ <Link href="/signup">建立帳號</Link>
        </p>
      </section>
    </main>
  );
}
