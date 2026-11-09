export type UserProfile = {
  id: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Deck = {
  id: string;
  name: string;
  description: string;
  deleting: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Flashcard = {
  id: string;
  deckId: string;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  dueAt: Date;
  deleting: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: string;
  grade: ReviewGrade;
  reviewedAt: Date;
};
