import { Timestamp } from "firebase/firestore";
import { z } from "zod";

export const documentIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export const deckInputSchema = z.object({
  name: z.string().trim().min(1, "牌組名稱不可空白。").max(120, "牌組名稱不可超過 120 個字元。"),
  description: z.string().trim().max(1000, "牌組描述不可超過 1000 個字元。"),
});

export const cardInputSchema = z.object({
  front: z.string().trim().min(1, "卡片正面不可空白。").max(5000, "卡片正面不可超過 5000 個字元。"),
  back: z.string().trim().min(1, "卡片背面不可空白。").max(5000, "卡片背面不可超過 5000 個字元。"),
});

export const cardUpdateSchema = cardInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "至少需要提供一個要更新的卡片欄位。",
);

export const reviewGradeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const cardScheduleSchema = z.object({
  easeFactor: z.number().min(1.3).max(5),
  intervalDays: z.number().int().min(0).max(36500),
  repetitions: z.number().int().min(0).max(10000),
  dueAt: z.date(),
});

export const storedDeckSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(1000),
    deleting: z.boolean(),
    createdAt: z.instanceof(Timestamp),
    updatedAt: z.instanceof(Timestamp),
  })
  .strict();

export const storedCardSchema = z
  .object({
    deckId: documentIdSchema,
    front: z.string().min(1).max(5000),
    back: z.string().min(1).max(5000),
    easeFactor: z.number().min(1.3).max(5),
    intervalDays: z.number().int().min(0).max(36500),
    repetitions: z.number().int().min(0).max(10000),
    dueAt: z.instanceof(Timestamp),
    deleting: z.boolean(),
    createdAt: z.instanceof(Timestamp),
    updatedAt: z.instanceof(Timestamp),
  })
  .strict();

export const storedReviewSchema = z
  .object({
    grade: reviewGradeSchema,
    reviewedAt: z.instanceof(Timestamp),
  })
  .strict();
