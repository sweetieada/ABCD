"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getFirebaseAuthErrorMessage,
  signOutUser,
} from "@/lib/firebase/auth";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  createDeck,
  deleteDeck,
  listDecks,
  subscribeToDecks,
  updateDeck,
} from "@/lib/firestore/decks";
import type { Deck } from "@/types/models";

export default function DashboardPage() {
  const { user, loading, error: authError } = useAuth();
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshDecks = useCallback(async () => {
    if (!user) return;
    setDecks(await listDecks(user.uid));
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    return subscribeToDecks(
      user.uid,
      setDecks,
      (error) => setMessage(getFirebaseAuthErrorMessage(error)),
    );
  }, [user]);

  async function handleSaveDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      const input = { name, description };
      if (editingId) {
        await updateDeck(user.uid, editingId, input);
      } else {
        await createDeck(user.uid, input);
      }
      setName("");
      setDescription("");
      setEditingId(null);
      await refreshDecks();
    } catch (error) {
      setMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDeck(deck: Deck) {
    if (!user || !window.confirm(`確定刪除「${deck.name}」及其中的卡片與複習紀錄嗎？`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteDeck(user.uid, deck.id);
      await refreshDecks();
    } catch (error) {
      setMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function startEditing(deck: Deck) {
    setEditingId(deck.id);
    setName(deck.name);
    setDescription(deck.description);
  }

  async function handleSignOut() {
    setBusy(true);
    try {
      await signOutUser();
      router.replace("/login");
    } catch (error) {
      setMessage(getFirebaseAuthErrorMessage(error));
      setBusy(false);
    }
  }

  if (loading || !user) {
    return <main className="page-shell" aria-live="polite">正在載入帳號…</main>;
  }

  return (
    <main className="page-shell">
      <section className="panel panel-wide stack">
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 6px", color: "#64748b" }}>MemoCard 智慧閃卡</p>
            <h1 style={{ margin: 0 }}>我的牌組</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              {user.displayName || user.email || "已登入"}
            </p>
          </div>
          <button className="button button-secondary" disabled={busy} onClick={handleSignOut} type="button">
            登出
          </button>
        </header>

        {authError && <p className="notice" role="alert">{authError}</p>}
        {message && <p className="notice" role="alert">{message}</p>}

        <form className="stack" onSubmit={handleSaveDeck}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{editingId ? "編輯牌組" : "新增牌組"}</h2>
          <label className="field">
            牌組名稱
            <input
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label className="field">
            描述（選填）
            <textarea
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              value={description}
            />
          </label>
          <div className="deck-actions">
            <button className="button" disabled={busy} type="submit">
              {busy ? "儲存中…" : editingId ? "儲存變更" : "建立牌組"}
            </button>
            {editingId && (
              <button
                className="button button-secondary"
                onClick={() => {
                  setEditingId(null);
                  setName("");
                  setDescription("");
                }}
                type="button"
              >
                取消編輯
              </button>
            )}
          </div>
        </form>

        <section aria-labelledby="deck-list-title">
          <h2 id="deck-list-title" style={{ fontSize: "1.1rem" }}>牌組清單</h2>
          {decks.length === 0 ? (
            <p style={{ color: "#64748b" }}>還沒有牌組，建立第一個牌組開始整理學習內容。</p>
          ) : (
            decks.map((deck) => (
              <article className="deck-row" key={deck.id}>
                <div>
                  <h3 style={{ margin: "0 0 6px" }}>{deck.name}</h3>
                  <p style={{ margin: 0, color: "#64748b" }}>
                    {deck.deleting
                      ? "刪除尚未完成，請繼續刪除。"
                      : deck.description || "尚未新增描述"}
                  </p>
                </div>
                <div className="deck-actions">
                  <button
                    className="button button-secondary"
                    disabled={busy || deck.deleting}
                    onClick={() => startEditing(deck)}
                    type="button"
                  >
                    編輯
                  </button>
                  <button
                    className="button button-danger"
                    disabled={busy}
                    onClick={() => void handleDeleteDeck(deck)}
                    type="button"
                  >
                    {deck.deleting ? "繼續刪除" : "刪除"}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
