import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
  type RulesTestContext,
} from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";

const projectId = "demo-memocard";
let testEnvironment: RulesTestEnvironment;

type TestFirestore = ReturnType<RulesTestContext["firestore"]>;

function databaseFor(uid: string): TestFirestore {
  return testEnvironment.authenticatedContext(uid).firestore();
}

async function createDeck(database: TestFirestore, uid: string) {
  await database.doc(`users/${uid}/decks/deck-1`).set({
    name: "英文",
    description: "",
    deleting: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("Firestore Security Rules", () => {
  beforeAll(async () => {
    const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: { rules },
    });
  });

  afterEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    if (testEnvironment) await testEnvironment.cleanup();
  });

  it("allows owners to create their profile and deck, but denies cross-user access", async () => {
    const ownerDatabase = databaseFor("owner");
    const otherDatabase = databaseFor("other");
    const profileRef = ownerDatabase.doc("users/owner");
    const deckRef = ownerDatabase.doc("users/owner/decks/deck-1");

    await assertSucceeds(
      profileRef.set({
        displayName: "學習者",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertSucceeds(createDeck(ownerDatabase, "owner"));
    await assertFails(otherDatabase.doc("users/owner").get());
    await assertFails(otherDatabase.doc("users/owner/decks/deck-1").get());
    await assertFails(
      otherDatabase.doc("users/owner/decks/deck-2").set({
        name: "未授權牌組",
        description: "",
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertSucceeds(deckRef.get());
  });

  it("rejects malformed or oversized data on both create and update", async () => {
    const database = databaseFor("owner");
    const deckRef = database.doc("users/owner/decks/deck-1");

    await assertFails(
      deckRef.set({
        name: "a".repeat(121),
        description: "",
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertSucceeds(createDeck(database, "owner"));
    await assertSucceeds(
      deckRef.update({
        name: "新版英文",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      deckRef.set(
        {
          name: "英文",
          description: "",
          deleting: false,
          isAdmin: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      ),
    );
  });

  it("requires a valid owner deck before creating cards and review records", async () => {
    const ownerDatabase = databaseFor("owner");
    const otherDatabase = databaseFor("other");
    await assertSucceeds(createDeck(ownerDatabase, "owner"));

    const cardRef = ownerDatabase.doc("users/owner/decks/deck-1/cards/card-1");
    await assertSucceeds(
      cardRef.set({
        deckId: "deck-1",
        front: "問題",
        back: "答案",
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: firebase.firestore.FieldValue.serverTimestamp(),
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertSucceeds(
      cardRef.update({
        easeFactor: 2.6,
        intervalDays: 1,
        repetitions: 1,
        dueAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );

    const reviewRef = cardRef.collection("reviews").doc("review-1");
    await assertSucceeds(
      reviewRef.set({
        grade: 4,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      cardRef.update({
        easeFactor: 1.2,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      otherDatabase.doc("users/owner/decks/deck-1/cards/card-2").set({
        deckId: "deck-1",
        front: "問題",
        back: "答案",
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: firebase.firestore.FieldValue.serverTimestamp(),
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      ownerDatabase.doc("users/owner/decks/missing/cards/card-3").set({
        deckId: "missing",
        front: "問題",
        back: "答案",
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: firebase.firestore.FieldValue.serverTimestamp(),
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      cardRef.collection("reviews").doc("review-invalid").set({
        grade: 9,
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
  });

  it("blocks new child writes after a deck enters the deletion state", async () => {
    const database = databaseFor("owner");
    const deckRef = database.doc("users/owner/decks/deck-1");
    await assertSucceeds(createDeck(database, "owner"));
    await assertSucceeds(
      deckRef.update({
        deleting: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );

    await assertFails(
      database.doc("users/owner/decks/deck-1/cards/card-1").set({
        deckId: "deck-1",
        front: "問題",
        back: "答案",
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        dueAt: firebase.firestore.FieldValue.serverTimestamp(),
        deleting: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
    await assertFails(
      deckRef.update({
        deleting: false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }),
    );
  });
});
