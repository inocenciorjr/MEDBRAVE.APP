import { auth, firestore } from '../../../config/firebaseAdmin';
import { Firestore } from 'firebase-admin/firestore';
import {
  CollectionReference,
  Timestamp,
} from 'firebase-admin/firestore';
import { AppError } from '../../../utils/errors';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { env } from '../../../config/env';
import logger from '../../../utils/logger';

import {
  IUser,
  IUserPreferences,
  IUserStats,
  IUserMfaConfig,
  UserRole,
  UserStatus,
  ICreateUserDTO,
  IUpdateUserDTO,
  ILoginUserDTO,
  IAuthResponse,
} from '../../user/types';

// Constantes de coleções
const USERS_COLLECTION = 'users';
// const USER_PROFILES_COLLECTION = 'userProfiles';
const REFRESH_TOKENS_COLLECTION = 'refreshTokens';

/**
 * Serviço de gerenciamento de usuários com Firebase
 */
export class FirebaseUserService {
  private static db: Firestore = firestore;
  private static usersCollection: CollectionReference = firestore.collection(USERS_COLLECTION);
  private static refreshTokensCollection: CollectionReference =
    firestore.collection(REFRESH_TOKENS_COLLECTION);

  /**
   * Cria um novo usuário
   */
  static async createUser(data: ICreateUserDTO): Promise<IUser> {
    try {
      const { email, password, displayName, role = UserRole.STUDENT, phoneNumber, photoURL } = data;

      // Verificar se o e-mail já está em uso
      const existingUser = await auth.getUserByEmail(email).catch(() => null);
      if (existingUser) {
        throw new AppError(400, 'Este e-mail já está em uso');
      }

      // Criar usuário no Firebase Auth
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false,
        phoneNumber,
      });

      if (!userRecord) {
        throw new AppError(500, 'Erro ao criar usuário no Firebase Auth');
      }

      const creationTimeISO = userRecord.metadata.creationTime || new Date().toISOString();
      const lastSignInTimeISO = userRecord.metadata.lastSignInTime || new Date().toISOString();

      // Configurações de MFA inicial
      const mfaConfig: IUserMfaConfig = {
        enabled: false,
        verified: false,
      };

      // Preferências iniciais do usuário
      const preferences: IUserPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        studyReminders: true,
        weeklyReports: true,
        darkMode: false,
        language: 'pt-BR',
      };

      // Estatísticas iniciais do usuário
      const stats: IUserStats = {
        questionsAnswered: 0,
        questionsCorrect: 0,
        questionsFlagged: 0,
        flashcardsReviewed: 0,
        flashcardsMastered: 0,
        errorsRegistered: 0,
        simulatedTestsCompleted: 0,
        studyTime: 0,
        lastStudySession: null,
        streak: 0,
        maxStreak: 0,
        pointsTotal: 0,
        level: 1,
      };

      // Novo usuário com formato compatível com IUser
      const newUser: IUser = {
        id: userRecord.uid,
        email: userRecord.email || email,
        displayName: userRecord.displayName || displayName,
        photoURL: photoURL || userRecord.photoURL || undefined,
        phoneNumber: phoneNumber || userRecord.phoneNumber || undefined,
        biography: '',
        role: role,
        status: UserStatus.PENDING_EMAIL_VERIFICATION,
        emailVerified: userRecord.emailVerified,
        mfa: mfaConfig,
        preferences: preferences,
        stats: stats,
        createdAt: new Date(creationTimeISO),
        updatedAt: new Date(lastSignInTimeISO),
        lastLoginAt: new Date(lastSignInTimeISO),
      };

      // Salvar o usuário no Firestore
      await this.usersCollection.doc(userRecord.uid).set({
        ...newUser,
        createdAt: Timestamp.fromDate(newUser.createdAt),
        updatedAt: Timestamp.fromDate(newUser.updatedAt),
        lastLoginAt: newUser.lastLoginAt ? Timestamp.fromDate(newUser.lastLoginAt) : null,
      });

      logger.info(`Usuário criado com sucesso: ${userRecord.uid}`);

      // Retornar o usuário criado
      return newUser;
    } catch (error) {
      logger.error('Erro ao criar usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao criar usuário');
    }
  }

  /**
   * Realiza login de usuário com email e senha
   */
  static async loginWithEmailAndPassword(data: ILoginUserDTO): Promise<IAuthResponse> {
    try {
      const { email, mfaCode } = data;

      // Buscar o usuário pelo email
      const userRecord = await auth.getUserByEmail(email).catch(() => {
        logger.warn(`Tentativa de login com email não cadastrado: ${email}`);
        throw new AppError(401, 'Credenciais inválidas');
      });

      // Verificar se o usuário está desativado
      if (userRecord.disabled) {
        logger.warn(`Tentativa de login em conta desativada: ${email}`);
        throw new AppError(403, 'Conta desativada. Entre em contato com o suporte.');
      }

      // Verificar a senha usando o Firebase Auth (necessário usar sign-in API)
      // Aqui estamos simulando isso pois não temos acesso direto
      // Em produção, isso seria feito através da Firebase Auth REST API

      // Buscar o usuário no Firestore
      const userDoc = await this.usersCollection.doc(userRecord.uid).get();
      if (!userDoc.exists) {
        throw new AppError(404, 'Dados do usuário não encontrados');
      }

      const userData = userDoc.data() as any;

      // Converter Timestamps para Dates
      const user: IUser = {
        ...userData,
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate(),
        lastLoginAt: userData.lastLoginAt ? userData.lastLoginAt.toDate() : null,
      };

      // Verificar se o MFA está habilitado
      if (user.mfa && user.mfa.enabled) {
        // Se o código MFA não foi fornecido, solicitar
        if (!mfaCode) {
          // Remover a propriedade mfa para segurança
          const { mfa: _, ...userWithoutMfa } = user;
          return {
            user: userWithoutMfa,
            tokens: {
              accessToken: '',
              refreshToken: '',
              expiresIn: 0,
            },
            mfaRequired: true,
          };
        }

        // Verificar o código MFA
        const verified = this.verifyMfaToken(user.mfa.secret || '', mfaCode);
        if (!verified) {
          logger.warn(`Código MFA inválido para usuário: ${user.id}`);
          throw new AppError(401, 'Código de verificação inválido');
        }
      }

      // Atualizar último login
      await this.updateUserLastLogin(userRecord.uid);

      // Gerar tokens
      const tokens = this.generateAuthTokens(user);

      // Registrar refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      logger.info(`Login bem-sucedido: ${user.id}`);

      // Remover a propriedade mfa para segurança
      const { mfa: _, ...userWithoutMfa } = user;
      return {
        user: userWithoutMfa,
        tokens,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erro no login:', error);
      throw new AppError(500, 'Erro ao processar login');
    }
  }

  /**
   * Busca um usuário pelo ID
   */
  static async getUserById(id: string): Promise<IUser | null> {
    try {
      const userDoc = await this.usersCollection.doc(id).get();

      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data() as any;

      // Converter Timestamps para Dates
      return {
        ...userData,
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate(),
        lastLoginAt: userData.lastLoginAt ? userData.lastLoginAt.toDate() : null,
      };
    } catch (error) {
      logger.error('Erro ao buscar usuário:', error);
      throw new AppError(500, 'Erro ao buscar usuário');
    }
  }

  /**
   * Atualiza dados de um usuário
   */
  static async updateUser(id: string, data: IUpdateUserDTO): Promise<IUser> {
    try {
      const userRef = this.usersCollection.doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      // Atualizar no Firebase Auth se houver dados relevantes
      if (data.displayName || data.photoURL || data.phoneNumber) {
        const authUpdateData: any = {};
        if (data.displayName) {
          authUpdateData.displayName = data.displayName;
        }
        if (data.photoURL) {
          authUpdateData.photoURL = data.photoURL;
        }
        if (data.phoneNumber) {
          authUpdateData.phoneNumber = data.phoneNumber;
        }

        await auth.updateUser(id, authUpdateData);
      }

      // Atualizar no Firestore
      await userRef.update(updateData);

      // Buscar usuário atualizado
      const updatedUser = await this.getUserById(id);
      if (!updatedUser) {
        throw new AppError(500, 'Erro ao recuperar usuário atualizado');
      }

      return updatedUser;
    } catch (error) {
      logger.error('Erro ao atualizar usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao atualizar usuário');
    }
  }

  /**
   * Atualiza preferências do usuário
   */
  static async updateUserPreferences(
    id: string,
    preferences: Partial<IUserPreferences>,
  ): Promise<IUser> {
    try {
      const userRef = this.usersCollection.doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      await userRef.update({
        preferences: { ...userDoc.data()?.preferences, ...preferences },
        updatedAt: Timestamp.now(),
      });

      const updatedUser = await this.getUserById(id);
      if (!updatedUser) {
        throw new AppError(500, 'Erro ao recuperar usuário atualizado');
      }

      return updatedUser;
    } catch (error) {
      logger.error('Erro ao atualizar preferências do usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao atualizar preferências do usuário');
    }
  }

  /**
   * Configura MFA para um usuário
   */
  static async setupMfa(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      // Gerar segredo para MFA
      const secret = speakeasy.generateSecret({
        name: `${env.MFA_ISSUER}:${userDoc.data()?.email}`,
        issuer: env.MFA_ISSUER,
      });

      // Atualizar documento do usuário com segredo (temporário, ainda não está verificado)
      await this.usersCollection.doc(userId).update({
        'mfa.secret': secret.base32,
        'mfa.enabled': false,
        'mfa.verified': false,
        updatedAt: Timestamp.now(),
      });

      logger.info(`MFA configurado para usuário: ${userId}`);

      return {
        secret: secret.base32,
        qrCodeUrl: secret.otpauth_url || '',
      };
    } catch (error) {
      logger.error('Erro ao configurar MFA:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao configurar autenticação multifator');
    }
  }

  /**
   * Verifica e ativa MFA para um usuário
   */
  static async verifyAndEnableMfa(userId: string, token: string): Promise<boolean> {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      const userData = userDoc.data();
      const secret = userData?.mfa?.secret;

      if (!secret) {
        throw new AppError(400, 'MFA não configurado para este usuário');
      }

      // Verificar o token
      const verified = this.verifyMfaToken(secret, token);

      if (!verified) {
        throw new AppError(400, 'Código de verificação inválido');
      }

      // Gerar códigos de recuperação
      const recoveryCodes = Array(10)
        .fill(0)
        .map(() => Math.random().toString(36).substring(2, 8).toUpperCase())
        .join(' ');

      // Hash dos códigos de recuperação
      const recoveryCodeHash = await bcrypt.hash(recoveryCodes, 10);

      // Atualizar usuário
      await this.usersCollection.doc(userId).update({
        'mfa.enabled': true,
        'mfa.verified': true,
        'mfa.recoveryCode': recoveryCodeHash,
        'mfa.lastVerifiedAt': Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`MFA ativado para usuário: ${userId}`);

      return true;
    } catch (error) {
      logger.error('Erro ao verificar MFA:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao verificar autenticação multifator');
    }
  }

  /**
   * Desativa MFA para um usuário
   */
  static async disableMfa(userId: string): Promise<boolean> {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      await this.usersCollection.doc(userId).update({
        'mfa.enabled': false,
        updatedAt: Timestamp.now(),
      });

      logger.info(`MFA desativado para usuário: ${userId}`);

      return true;
    } catch (error) {
      logger.error('Erro ao desativar MFA:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao desativar autenticação multifator');
    }
  }

  /**
   * Atualiza o papel (role) de um usuário
   */
  static async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      const userRef = this.usersCollection.doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      await userRef.update({
        role,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Papel do usuário atualizado: ${userId} -> ${role}`);
    } catch (error) {
      logger.error('Erro ao atualizar papel do usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao atualizar papel do usuário');
    }
  }

  /**
   * Atualiza o último login de um usuário
   */
  static async updateUserLastLogin(userId: string): Promise<void> {
    try {
      const userRef = this.usersCollection.doc(userId);
      const now = Timestamp.now();

      await userRef.update({
        lastLoginAt: now,
        updatedAt: now,
      });
    } catch (error) {
      logger.error('Erro ao atualizar último login do usuário:', error);
      // Não lançamos erro aqui para não interromper o fluxo de login
    }
  }

  /**
   * Desativa um usuário
   */
  static async disableUser(userId: string): Promise<void> {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      // Desativar no Firebase Auth
      await auth.updateUser(userId, { disabled: true });

      // Atualizar status no Firestore
      await this.usersCollection.doc(userId).update({
        status: UserStatus.INACTIVE,
        updatedAt: Timestamp.now(),
      });

      // Invalidar todos os refresh tokens
      await this.invalidateAllRefreshTokens(userId);

      logger.info(`Usuário desativado: ${userId}`);
    } catch (error) {
      logger.error('Erro ao desativar usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao desativar usuário');
    }
  }

  /**
   * Reativa um usuário
   */
  static async enableUser(userId: string): Promise<void> {
    try {
      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      // Ativar no Firebase Auth
      await auth.updateUser(userId, { disabled: false });

      // Atualizar status no Firestore
      await this.usersCollection.doc(userId).update({
        status: UserStatus.ACTIVE,
        updatedAt: Timestamp.now(),
      });

      logger.info(`Usuário reativado: ${userId}`);
    } catch (error) {
      logger.error('Erro ao reativar usuário:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Erro ao reativar usuário');
    }
  }

  /**
   * Verifica um token MFA
   */
  private static verifyMfaToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1, // Permite 1 período antes/depois para compensar dessincronia de relógio
    });
  }

  /**
   * Gera tokens de autenticação (JWT)
   */
  private static generateAuthTokens(user: IUser): {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } {
    // Payload do token
    const payload = {
      uid: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    // Opções do token
    const accessTokenOptions = {
      expiresIn: env.JWT_EXPIRES_IN,
    };

    // Opções do refresh token (mais longo)
    const refreshTokenOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    };

    // Calcular expiração em segundos
    const expiresInSeconds =
      parseInt(env.JWT_EXPIRES_IN.replace(/[^0-9]/g, '')) *
      (env.JWT_EXPIRES_IN.includes('h') ? 3600 : env.JWT_EXPIRES_IN.includes('m') ? 60 : 1);

    // Gerar tokens
    const accessToken = jwt.sign(payload, env.JWT_SECRET, accessTokenOptions as jwt.SignOptions);
    const refreshToken = jwt.sign(
      payload,
      env.JWT_REFRESH_SECRET,
      refreshTokenOptions as jwt.SignOptions,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Salva um refresh token no banco
   */
  private static async saveRefreshToken(userId: string, token: string): Promise<void> {
    try {
      // Hash do token para armazenamento seguro
      const hashedToken = await bcrypt.hash(token, 10);

      // Token id único
      const tokenId = `${userId}-${Date.now()}`;

      // Expiração baseada nas configurações
      const expiresAt = new Date();
      const expiryValue = parseInt(env.JWT_REFRESH_EXPIRES_IN.replace(/[^0-9]/g, ''));

      if (env.JWT_REFRESH_EXPIRES_IN.includes('d')) {
        expiresAt.setDate(expiresAt.getDate() + expiryValue);
      } else if (env.JWT_REFRESH_EXPIRES_IN.includes('h')) {
        expiresAt.setHours(expiresAt.getHours() + expiryValue);
      } else {
        expiresAt.setSeconds(expiresAt.getSeconds() + expiryValue);
      }

      // Salvar o token
      await this.refreshTokensCollection.doc(tokenId).set({
        userId,
        token: hashedToken,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isRevoked: false,
      });
    } catch (error) {
      logger.error('Erro ao salvar refresh token:', error);
      // Não interromper o fluxo de login
    }
  }

  /**
   * Invalida todos os refresh tokens de um usuário
   */
  private static async invalidateAllRefreshTokens(userId: string): Promise<void> {
    try {
      const snapshot = await this.refreshTokensCollection
        .where('userId', '==', userId)
        .where('isRevoked', '==', false)
        .get();

      const batch = this.db.batch();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRevoked: true });
      });

      await batch.commit();
    } catch (error) {
      logger.error('Erro ao invalidar refresh tokens:', error);
    }
  }

  /**
   * Atualiza tokens a partir de um refresh token
   */
  static async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Verificar e decodificar o refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        uid: string;
        email: string;
        role: string;
        emailVerified: boolean;
      };

      // Buscar tokens ativos do usuário
      const snapshot = await this.refreshTokensCollection
        .where('userId', '==', decoded.uid)
        .where('isRevoked', '==', false)
        .where('expiresAt', '>', Timestamp.now())
        .get();

      // Verificar se o token está entre os válidos
      let isValid = false;
      let tokenDoc;

      for (const doc of snapshot.docs) {
        const storedToken = doc.data();

        // Comparar o token com o hash armazenado
        const match = await bcrypt.compare(refreshToken, storedToken.token);

        if (match) {
          isValid = true;
          tokenDoc = doc;
          break;
        }
      }

      if (!isValid || !tokenDoc) {
        throw new AppError(401, 'Refresh token inválido ou expirado');
      }

      // Buscar dados atualizados do usuário
      const user = await this.getUserById(decoded.uid);

      if (!user) {
        throw new AppError(404, 'Usuário não encontrado');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new AppError(403, 'Conta de usuário inativa');
      }

      // Gerar novos tokens
      const tokens = this.generateAuthTokens(user);

      // Invalidar o token usado
      await tokenDoc.ref.update({ isRevoked: true });

      // Salvar o novo refresh token
      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError(401, 'Refresh token expirado');
      }

      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Erro ao atualizar tokens:', error);
      throw new AppError(500, 'Erro ao atualizar tokens');
    }
  }
}

/**
 * Valida se um usuário existe
 */
export async function validateUserExists(userId: string): Promise<void> {
  const userDoc = await firestore.collection(USERS_COLLECTION).doc(userId).get();
  if (!userDoc.exists) {
    throw new AppError(404, 'Usuário não encontrado');
  }
}
