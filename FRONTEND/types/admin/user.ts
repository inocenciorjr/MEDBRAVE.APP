/**
 * User types for admin management
 */

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_EMAIL_VERIFICATION = 'PENDING_EMAIL_VERIFICATION',
}

export interface UserStats {
  questionsAnswered: number;
  questionsCorrect: number;
  questionsFlagged: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
  errorsRegistered: number;
  simulatedTestsCompleted: number;
  studyTime: number;
  lastStudySession: Date | null;
  streak: number;
  maxStreak: number;
  pointsTotal: number;
  level: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  biography?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  stats?: UserStats;
  specialties?: string[];
  mentorshipAvailable?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string;
}

export type UserSortField = 'displayName' | 'email' | 'role' | 'status' | 'createdAt' | 'lastLoginAt';
