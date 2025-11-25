export enum MFAType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  AUTHENTICATOR = 'AUTHENTICATOR',
  BACKUP_CODES = 'BACKUP_CODES',
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  MFA_INVALID = 'MFA_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_IN_USE = 'EMAIL_IN_USE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

export interface MFASettings {
  enabled: boolean;
  preferredMethod: MFAType;
  methods: {
    [key in MFAType]?: {
      enabled: boolean;
      verified: boolean;
      lastVerified?: Date;
      secret?: string;
      backupCodes?: string[];
    };
  };
}

export interface AuthUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  disabled?: boolean;
  mfa_settings?: MFASettings;
  last_login?: Date;
  failed_login_attempts?: number;
  locked_until?: Date;
  display_name?: string;
  photo_url?: string;
  phone_number?: string;
  metadata?: {
    creation_time?: string;
    last_sign_in_time?: string;
  };
  toJSON(): any;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  mfaType?: MFAType;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
  mfaRequired?: boolean;
  mfaType?: MFAType;
}

export interface MFAVerifyRequest {
  userId: string;
  mfaType: MFAType;
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthError extends Error {
  code: AuthErrorCode;
  details?: any;
}
