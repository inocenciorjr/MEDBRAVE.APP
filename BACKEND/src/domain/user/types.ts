/**
 * Tipos e interfaces relacionados a usuários no sistema
 */

/**
 * Papéis de usuário no sistema
 */
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  MENTOR = 'MENTOR',
  ADMIN = 'ADMIN',
}

/**
 * Status do usuário
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_EMAIL_VERIFICATION = 'PENDING_EMAIL_VERIFICATION',
}

/**
 * Configurações de MFA (Multi-Factor Authentication)
 */
export interface IUserMfaConfig {
  enabled: boolean;
  verified: boolean;
  secret?: string;
  recoveryCode?: string;
  lastVerifiedAt?: Date;
}

/**
 * Preferências do usuário
 */
export interface IUserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  studyReminders: boolean;
  weeklyReports: boolean;
  darkMode: boolean;
  language: string;
}

/**
 * Estatísticas gerais do usuário
 */
export interface IUserStats {
  questionsAnswered: number;
  questionsCorrect: number;
  questionsFlagged: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
  errorsRegistered: number;
  simulatedTestsCompleted: number;
  studyTime: number; // Em minutos
  lastStudySession: Date | null;
  streak: number; // Dias consecutivos de estudo
  maxStreak: number; // Máximo de dias consecutivos
  pointsTotal: number;
  level: number;
}

/**
 * Interface completa do usuário
 */
export interface IUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  biography?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  mfa: IUserMfaConfig;
  preferences: IUserPreferences;
  stats: IUserStats;
  specialties?: string[];
  mentorshipAvailable?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  deletedAt?: Date;
}

/**
 * DTO para criação de usuário
 */
export interface ICreateUserDTO {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
  phoneNumber?: string;
  photoURL?: string;
}

/**
 * DTO para atualização de usuário
 */
export interface IUpdateUserDTO {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  biography?: string;
  specialties?: string[];
  mentorshipAvailable?: boolean;
  preferences?: Partial<IUserPreferences>;
}

/**
 * DTO para login de usuário
 */
export interface ILoginUserDTO {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Resposta de autenticação
 */
export interface IAuthResponse {
  user: Omit<IUser, 'mfa'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  mfaRequired?: boolean;
}
