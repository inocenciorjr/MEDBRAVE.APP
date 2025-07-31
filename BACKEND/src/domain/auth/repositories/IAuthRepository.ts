import { AuthUser, MFASettings, MFAType } from '../types/auth.types';

export interface IAuthRepository {
  createUser(email: string, password: string): Promise<AuthUser>;
  getUserById(userId: string): Promise<AuthUser>;
  getUserByEmail(email: string): Promise<AuthUser>;
  updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser>;
  deleteUser(userId: string): Promise<void>;
  
  // MFA Methods
  enableMFA(userId: string, type: MFAType): Promise<MFASettings>;
  disableMFA(userId: string, type: MFAType): Promise<MFASettings>;
  verifyMFA(userId: string, type: MFAType, code: string): Promise<boolean>;
  generateMFASecret(userId: string, type: MFAType): Promise<string>;
  
  // Token Methods
  createCustomToken(userId: string): Promise<string>;
  verifyIdToken(token: string): Promise<AuthUser>;
  revokeRefreshTokens(userId: string): Promise<void>;
  
  // Account security
  updateLastLogin(userId: string): Promise<void>;
  incrementFailedLoginAttempts(userId: string): Promise<number>;
  resetFailedLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, duration: number): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
} 