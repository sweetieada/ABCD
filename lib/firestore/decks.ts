import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import { deckInputSchema, documentIdSchema, storedDeckSchema } from "@/lib/firestore/schemas";
import type { Deck } from "@/types/models";

const batchSize = 450;

function decodeDeck(id: string, value: unknown): Deck {
  const parsed = storedDeckSchema.safeParse(value);
  if (!parsed.success) {
    const invalidFields = [...new Set(
      parsed.error.issues.map((issue) => issue.path.join(".") || "document"),
    )];
    throw new Error(`牌組資料格式不正確（文件 ${id}；欄位：${invalidFields.join(", ")}）。`);
  }

  return {
    id,
    ...parsed.data,
    createdAt: parsed.data.createdAt.toDate(),
    updatedAt: parsed.data.updatedAt.toDate(),
  };
}

function decksQuery(uid: string) {
  return query(
    collection(getFirestoreDb(), "users", uid, "decks"),
    orderBy("updatedAt", "desc"),
  );
}

export async function listDecks(uid: string) {
  const snapshot = await getDocs(decksQuery(uid));
  return snapshot.docs.map((item) =>
    decodeDeck(item.id, item.data({ serverTimestamps: "estimate" })),
  );
}

export function subscribeToDecks(
  uid: string,
  onChange: (decks: Deck[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    decksQuery(uid),
    (snapshot) => {
      try {
        onChange(
          snapshot.docs.map((item) =>
            decodeDeck(item.id, item.data({ serverTimestamps: "estimate" })),
          ),
        );
      } catch (error) {
        onError(error instanceof Error ? error : new Error("無法讀取牌組資料。"));
      }
    },
    onError,
  );
}

export async function createDeck(
  uid: string,
  input: { name: string; description: string },
) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedInput = deckInputSchema.safeParse(input);
  if (!parsedUid.success) throw new Error("使用者識別資料無效。");
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "牌組資料無效。");
  }

  const reference = await addDoc(collection(getFirestoreDb(), "users", uid, "decks"), {
    ...parsedInput.data,
    deleting: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateDeck(
  uid: string,
  deckId: string,
  input: { name: string; description: string },
) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedInput = deckInputSchema.safeParse(input);
  if (!parsedUid.success || !parsedDeckId.success) throw new Error("牌組識別資料無效。");
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "牌組資料無效。");
  }

  await updateDoc(doc(getFirestoreDb(), "users", uid, "decks", deckId), {
    ...parsedInput.data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDeck(uid: string, deckId: string) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  if (!parsedUid.success || !parsedDeckId.success) throw new Error("牌組識別資料無效。");

  const database = getFirestoreDb();
  const deckRef = doc(database, "users", uid, "decks", deckId);
  await updateDoc(deckRef, { deleting: true, updatedAt: serverTimestamp() });

  const cards = await getDocs(collection(deckRef, "cards"));
  const references = [];
  for (const card of cards.docs) {
    const reviews = await getDocs(collection(card.ref, "reviews"));
    references.push(...reviews.docs.map((review) => review.ref), card.ref);
  }

  for (let offset = 0; offset < references.length; offset += batchSize) {
    const batch = writeBatch(database);
    for (const reference of references.slice(offset, offset + batchSize)) {
      batch.delete(reference);
    }
    await batch.commit();
  }
  await deleteDoc(deckRef);
}
