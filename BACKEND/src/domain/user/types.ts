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
  questions_answered: number;
  questions_correct: number;
  questions_flagged: number;
  flashcards_reviewed: number;
  flashcards_mastered: number;
  errors_registered: number;
  simulated_tests_completed: number;
  study_time: number; // Em minutos
  last_study_session: Date | null;
  streak: number; // Dias consecutivos de estudo
  max_streak: number; // Máximo de dias consecutivos
  points_total: number;
  level: number;
}

/**
 * Interface completa do usuário
 */
export interface IUser {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  phone_number?: string;
  biography?: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  mfa: IUserMfaConfig;
  preferences: IUserPreferences;
  stats: IUserStats;
  specialties?: string[];
  mentorship_available?: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  deleted_at?: Date;
}

/**
 * DTO para criação de usuário
 */
export interface ICreateUserDTO {
  email: string;
  password: string;
  display_name: string;
  role?: UserRole;
  phone_number?: string;
  photo_url?: string;
}

/**
 * DTO para atualização de usuário
 */
export interface IUpdateUserDTO {
  display_name?: string;
  photo_url?: string;
  phone_number?: string;
  biography?: string;
  specialties?: string[];
  mentorship_available?: boolean;
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
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  mfa_required?: boolean;
}
