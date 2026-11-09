import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  cardInputSchema,
  cardScheduleSchema,
  cardUpdateSchema,
  documentIdSchema,
  reviewGradeSchema,
  storedCardSchema,
  storedReviewSchema,
} from "@/lib/firestore/schemas";
import type { Flashcard, Review, ReviewGrade } from "@/types/models";

const batchSize = 450;

function cardCollection(uid: string, deckId: string) {
  return collection(getFirestoreDb(), "users", uid, "decks", deckId, "cards");
}

function decodeCard(id: string, value: unknown): Flashcard {
  const parsed = storedCardSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("資料庫中的卡片資料格式不正確。");
  }

  return {
    id,
    ...parsed.data,
    dueAt: parsed.data.dueAt.toDate(),
    createdAt: parsed.data.createdAt.toDate(),
    updatedAt: parsed.data.updatedAt.toDate(),
  };
}

export async function listCards(uid: string, deckId: string) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  if (!parsedUid.success || !parsedDeckId.success) throw new Error("牌組識別資料無效。");

  const cardsQuery = query(
    cardCollection(uid, deckId),
    orderBy("createdAt", "asc"),
  );
  const snapshot = await getDocs(cardsQuery);
  return snapshot.docs.map((item) => decodeCard(item.id, item.data()));
}

export async function listDueCards(uid: string, deckId: string, now = new Date()) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  if (!parsedUid.success || !parsedDeckId.success) throw new Error("牌組識別資料無效。");

  const dueCardsQuery = query(
    cardCollection(uid, deckId),
    where("deleting", "==", false),
    where("dueAt", "<=", now),
    orderBy("dueAt", "asc"),
  );
  const snapshot = await getDocs(dueCardsQuery);
  return snapshot.docs.map((item) => decodeCard(item.id, item.data()));
}

export async function createCard(
  uid: string,
  deckId: string,
  input: { front: string; back: string },
) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedInput = cardInputSchema.safeParse(input);
  if (!parsedUid.success || !parsedDeckId.success) throw new Error("牌組識別資料無效。");
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "卡片資料無效。");
  }

  const reference = await addDoc(cardCollection(uid, deckId), {
    ...parsedInput.data,
    deckId,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    dueAt: serverTimestamp(),
    deleting: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function updateCard(
  uid: string,
  deckId: string,
  cardId: string,
  input: { front?: string; back?: string },
) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedCardId = documentIdSchema.safeParse(cardId);
  const parsedInput = cardUpdateSchema.safeParse(input);
  if (!parsedUid.success || !parsedDeckId.success || !parsedCardId.success) {
    throw new Error("卡片識別資料無效。");
  }
  if (!parsedInput.success) {
    throw new Error(parsedInput.error.issues[0]?.message ?? "卡片資料無效。");
  }

  await updateDoc(doc(cardCollection(uid, deckId), cardId), {
    ...parsedInput.data,
    updatedAt: serverTimestamp(),
  });
}

export async function recordReview(
  uid: string,
  deckId: string,
  cardId: string,
  grade: ReviewGrade,
  nextSchedule: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    dueAt: Date;
  },
) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedCardId = documentIdSchema.safeParse(cardId);
  const parsedGrade = reviewGradeSchema.safeParse(grade);
  const parsedSchedule = cardScheduleSchema.safeParse(nextSchedule);
  if (!parsedUid.success || !parsedDeckId.success || !parsedCardId.success) {
    throw new Error("卡片識別資料無效。");
  }
  if (!parsedGrade.success) throw new Error("複習評分必須介於 0 到 5。");
  if (!parsedSchedule.success) {
    throw new Error("新的複習排程資料無效。");
  }

  const database = getFirestoreDb();
  const cardRef = doc(cardCollection(uid, deckId), cardId);
  const reviewRef = doc(collection(cardRef, "reviews"));

  await runTransaction(database, async (transaction) => {
    const card = await transaction.get(cardRef);
    if (!card.exists()) throw new Error("找不到要複習的卡片。");
    const storedCard = storedCardSchema.safeParse(card.data());
    if (!storedCard.success) throw new Error("資料庫中的卡片資料格式不正確。");
    if (storedCard.data.deleting) throw new Error("這張卡片正在刪除，無法新增複習紀錄。");

    transaction.update(cardRef, {
      ...parsedSchedule.data,
      updatedAt: serverTimestamp(),
    });
    transaction.set(reviewRef, {
      grade: parsedGrade.data,
      reviewedAt: serverTimestamp(),
    });
  });
  return reviewRef.id;
}

export async function deleteCard(uid: string, deckId: string, cardId: string) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedCardId = documentIdSchema.safeParse(cardId);
  if (!parsedUid.success || !parsedDeckId.success || !parsedCardId.success) {
    throw new Error("卡片識別資料無效。");
  }

  const database = getFirestoreDb();
  const cardRef = doc(cardCollection(uid, deckId), cardId);
  await updateDoc(cardRef, { deleting: true, updatedAt: serverTimestamp() });

  const reviews = await getDocs(collection(cardRef, "reviews"));
  for (let offset = 0; offset < reviews.docs.length; offset += batchSize) {
    const batch = writeBatch(database);
    for (const review of reviews.docs.slice(offset, offset + batchSize)) {
      batch.delete(review.ref);
    }
    await batch.commit();
  }
  await deleteDoc(cardRef);
}

export async function listReviews(uid: string, deckId: string, cardId: string) {
  const parsedUid = documentIdSchema.safeParse(uid);
  const parsedDeckId = documentIdSchema.safeParse(deckId);
  const parsedCardId = documentIdSchema.safeParse(cardId);
  if (!parsedUid.success || !parsedDeckId.success || !parsedCardId.success) {
    throw new Error("卡片識別資料無效。");
  }

  const reviewsQuery = query(
    collection(doc(cardCollection(uid, deckId), cardId), "reviews"),
    orderBy("reviewedAt", "desc"),
  );
  const snapshot = await getDocs(reviewsQuery);
  return snapshot.docs.map((item): Review => {
    const parsed = storedReviewSchema.safeParse(item.data());
    if (!parsed.success) {
      throw new Error("資料庫中的複習紀錄格式不正確。");
    }
    return {
      id: item.id,
      grade: parsed.data.grade,
      reviewedAt: parsed.data.reviewedAt.toDate(),
    };
  });
}
