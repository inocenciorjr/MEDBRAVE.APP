import { auth } from '../../../config/firebaseAdmin';
import { IAuthRepository } from '../../../domain/auth/repositories/IAuthRepository';
import { AuthUser, MFASettings, MFAType } from '../../../domain/auth/types/auth.types';
import { getFirestore } from 'firebase-admin/firestore';
import { UserRecord } from 'firebase-admin/auth';
import * as speakeasy from 'speakeasy';

export class FirebaseAuthRepository implements IAuthRepository {
  private readonly usersCollection = getFirestore().collection('users');
  private readonly mfaCollection = getFirestore().collection('mfa_settings');

  async createUser(email: string, password: string): Promise<AuthUser> {
    try {
      const userRecord = await auth.createUser({
        email,
        password,
        emailVerified: false,
        disabled: false,
      });

      const authUser: AuthUser = {
        ...userRecord,
        toJSON: () => ({ ...userRecord }),
        mfaSettings: {
          enabled: false,
          preferredMethod: MFAType.EMAIL,
          methods: {},
        },
        lastLogin: undefined,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
      };

      await this.usersCollection.doc(userRecord.uid).set({
        mfaSettings: authUser.mfaSettings,
        lastLogin: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      });

      return authUser;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async getUserById(userId: string): Promise<AuthUser> {
    try {
      const [userRecord, userData] = await Promise.all([
        auth.getUser(userId),
        this.usersCollection.doc(userId).get(),
      ]);

      return this.mergeUserData(userRecord, userData.data());
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async getUserByEmail(email: string): Promise<AuthUser> {
    try {
      const userRecord = await auth.getUserByEmail(email);
      const userData = await this.usersCollection.doc(userRecord.uid).get();

      return this.mergeUserData(userRecord, userData.data());
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const updateData: any = {};
      const authUpdateData: any = {};

      // Separar dados do Auth e do Firestore
      if ('email' in data) {
        authUpdateData.email = data.email;
      }
      if ('emailVerified' in data) {
        authUpdateData.emailVerified = data.emailVerified;
      }
      if ('disabled' in data) {
        authUpdateData.disabled = data.disabled;
      }

      if (data.mfaSettings) {
        updateData.mfaSettings = data.mfaSettings;
      }
      if (data.lastLogin) {
        updateData.lastLogin = data.lastLogin;
      }
      if (data.failedLoginAttempts) {
        updateData.failedLoginAttempts = data.failedLoginAttempts;
      }
      if (data.lockedUntil) {
        updateData.lockedUntil = data.lockedUntil;
      }

      // Atualizar no Auth se necessário
      if (Object.keys(authUpdateData).length > 0) {
        await auth.updateUser(userId, authUpdateData);
      }

      // Atualizar no Firestore se necessário
      if (Object.keys(updateData).length > 0) {
        await this.usersCollection.doc(userId).update(updateData);
      }

      return this.getUserById(userId);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await Promise.all([
        auth.deleteUser(userId),
        this.usersCollection.doc(userId).delete(),
        this.mfaCollection.doc(userId).delete(),
      ]);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  // MFA Methods
  async enableMFA(userId: string, type: MFAType): Promise<MFASettings> {
    try {
      const userData = await this.usersCollection.doc(userId).get();
      const currentSettings: MFASettings = userData.data()?.mfaSettings || {
        enabled: false,
        preferredMethod: type,
        methods: {},
      };

      const secret = await this.generateMFASecret();

      currentSettings.enabled = true;
      currentSettings.preferredMethod = type;
      currentSettings.methods[type] = {
        enabled: true,
        verified: false,
        lastVerified: undefined,
      };

      await this.mfaCollection.doc(userId).set(
        {
          [type]: { secret },
        },
        { merge: true },
      );

      await this.usersCollection.doc(userId).update({
        mfaSettings: currentSettings,
      });

      return currentSettings;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async disableMFA(userId: string, type: MFAType): Promise<MFASettings> {
    try {
      const userData = await this.usersCollection.doc(userId).get();
      const currentSettings: MFASettings = userData.data()?.mfaSettings;

      if (currentSettings?.methods[type]) {
        delete currentSettings.methods[type];
      }

      currentSettings.enabled = Object.keys(currentSettings.methods).length > 0;
      if (!currentSettings.enabled) {
        currentSettings.preferredMethod = MFAType.EMAIL;
      }

      await Promise.all([
        this.usersCollection.doc(userId).update({
          mfaSettings: currentSettings,
        }),
        this.mfaCollection.doc(userId).update({
          [type]: null,
        }),
      ]);

      return currentSettings;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async verifyMFA(userId: string, type: MFAType, code: string): Promise<boolean> {
    try {
      const mfaData = await this.mfaCollection.doc(userId).get();
      const secret = mfaData.data()?.[type]?.secret;

      if (!secret) {
        throw new Error('MFA not configured');
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (verified) {
        await this.usersCollection.doc(userId).update({
          [`mfaSettings.methods.${type}`]: {
            verified: true,
            lastVerified: new Date(),
          },
        });
      }

      return verified;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async generateMFASecret(): Promise<string> {
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    return secret;
  }

  // Token Methods
  async createCustomToken(userId: string): Promise<string> {
    try {
      const customToken = await auth.createCustomToken(userId);
      return customToken;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async verifyIdToken(token: string): Promise<AuthUser> {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      return this.getUserById(decodedToken.uid);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    try {
      await auth.revokeRefreshTokens(userId);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  // Session Methods
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.usersCollection.doc(userId).update({
        lastLogin: new Date(),
      });
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async incrementFailedLoginAttempts(userId: string): Promise<number> {
    try {
      const userRef = this.usersCollection.doc(userId);
      const userData = await userRef.get();
      const attempts = (userData.data()?.failedLoginAttempts || 0) + 1;

      await userRef.update({
        failedLoginAttempts: attempts,
      });

      return attempts;
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.usersCollection.doc(userId).update({
        failedLoginAttempts: 0,
      });
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async lockAccount(userId: string, duration: number): Promise<void> {
    try {
      const lockUntil = new Date(Date.now() + duration);
      await Promise.all([
        auth.updateUser(userId, { disabled: true }),
        this.usersCollection.doc(userId).update({
          lockedUntil: lockUntil,
        }),
      ]);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  async unlockAccount(userId: string): Promise<void> {
    try {
      await Promise.all([
        auth.updateUser(userId, { disabled: false }),
        this.usersCollection.doc(userId).update({
          lockedUntil: null,
          failedLoginAttempts: 0,
        }),
      ]);
    } catch (error) {
      throw this.handleFirebaseError(error);
    }
  }

  // Helper Methods
  private mergeUserData(userRecord: UserRecord, userData: any): AuthUser {
    return {
      ...userRecord,
      toJSON: () => ({ ...userRecord }),
      mfaSettings: userData?.mfaSettings || {
        enabled: false,
        preferredMethod: MFAType.EMAIL,
        methods: {},
      },
      lastLogin: userData?.lastLogin?.toDate(),
      failedLoginAttempts: userData?.failedLoginAttempts || 0,
      lockedUntil: userData?.lockedUntil?.toDate(),
    };
  }

  private handleFirebaseError(error: any): Error {
    // Implementar tratamento específico de erros do Firebase
    return error;
  }
}
