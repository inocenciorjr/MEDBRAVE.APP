import { User } from '../entities/User';
import { Result } from '../../../shared/types/Result';
import { LoginCredentials, CreateUserData, UpdateUserData } from '../../../domain/user/types/index';

export interface UserFilters {
  email?: string;
  name?: string;
  is_active?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface PaginatedUsersResult {
  users: User[];
  total: number;
  has_more: boolean;
}

export interface IUserService {
  createUser(userData: CreateUserData): Promise<Result<User>>;
  loginUser(credentials: LoginCredentials): Promise<Result<{ user: User; accessToken: string; refreshToken: string }>>;
  updateUser(id: string, updateData: UpdateUserData): Promise<Result<User>>;
  getUserById(id: string): Promise<Result<User | null>>;
  getUserByEmail(email: string): Promise<Result<User | null>>;
  getUserByUsername(username: string): Promise<Result<User | null>>;
  enableMFA(userId: string): Promise<Result<{ qrCode: string; secret: string }>>;
  verifyMFA(userId: string, code: string): Promise<Result<boolean>>;
  disableMFA(userId: string): Promise<Result<void>>;
  deactivateUser(userId: string): Promise<Result<void>>;
  activateUser(userId: string): Promise<Result<void>>;
  refreshToken(refreshToken: string): Promise<Result<{ accessToken: string; refreshToken: string }>>;
  verifyToken(token: string): Promise<Result<boolean>>;
  revokeToken(token: string): Promise<Result<void>>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<Result<void>>;
  resetPassword(email: string): Promise<Result<void>>;
  deleteUser(userId: string): Promise<Result<void>>;
  listUsers(filters?: UserFilters, pagination?: { limit?: number; page?: number }): Promise<Result<PaginatedUsersResult>>;
  getUserStats(userId: string): Promise<Result<{
    total_decks: number;
    total_flashcards: number;
    // total_study_sessions: number; // Removed
    last_activity: string | null;
  }>>;
  updateLastActivity(userId: string): Promise<Result<void>>;
  getUserPreferences(userId: string): Promise<Result<Record<string, any>>>;
  updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<Result<void>>;
}