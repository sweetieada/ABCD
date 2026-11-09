import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import {
  cardScheduleSchema,
  cardInputSchema,
  cardUpdateSchema,
  deckInputSchema,
  reviewGradeSchema,
  storedDeckSchema,
} from "../lib/firestore/schemas";

describe("Firestore input schemas", () => {
  it("accepts a valid deck and trims its text", () => {
    expect(deckInputSchema.parse({ name: "  英文  ", description: "  單字  " })).toEqual({
      name: "英文",
      description: "單字",
    });
  });

  it("rejects blank and oversized deck names", () => {
    expect(deckInputSchema.safeParse({ name: " ", description: "" }).success).toBe(false);
    expect(deckInputSchema.safeParse({ name: "a".repeat(121), description: "" }).success).toBe(false);
  });

  it("rejects blank card sides and empty updates", () => {
    expect(cardInputSchema.safeParse({ front: "", back: "答案" }).success).toBe(false);
    expect(cardUpdateSchema.safeParse({}).success).toBe(false);
    expect(cardUpdateSchema.safeParse({ front: "問題" }).success).toBe(true);
  });

  it("accepts only integer review grades from zero through five", () => {
    for (let grade = 0; grade <= 5; grade += 1) {
      expect(reviewGradeSchema.safeParse(grade).success).toBe(true);
    }
    expect(reviewGradeSchema.safeParse(6).success).toBe(false);
    expect(reviewGradeSchema.safeParse(2.5).success).toBe(false);
  });

  it("validates the next review schedule before it is written", () => {
    expect(
      cardScheduleSchema.safeParse({
        easeFactor: 2.5,
        intervalDays: 3,
        repetitions: 2,
        dueAt: new Date("2026-01-04T00:00:00.000Z"),
      }).success,
    ).toBe(true);
    expect(
      cardScheduleSchema.safeParse({
        easeFactor: 1.2,
        intervalDays: -1,
        repetitions: 0,
        dueAt: new Date("invalid"),
      }).success,
    ).toBe(false);
  });

  it("validates stored data and rejects fields not in the Firestore model", () => {
    const now = Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z"));
    const deck = {
      name: "英文",
      description: "",
      deleting: false,
      createdAt: now,
      updatedAt: now,
    };

    expect(storedDeckSchema.safeParse(deck).success).toBe(true);
    expect(storedDeckSchema.safeParse({ ...deck, isAdmin: true }).success).toBe(false);
  });
});
