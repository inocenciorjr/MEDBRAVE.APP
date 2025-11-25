import { SupabaseClient } from '@supabase/supabase-js';
import { IAuthRepository } from '../../../domain/auth/repositories/IAuthRepository';
import {
  AuthUser,
  MFASettings,
  MFAType,
} from '../../../domain/auth/types/auth.types';
import supabase from '../../../config/supabaseAdmin';
import * as speakeasy from 'speakeasy';

export class SupabaseAuthRepository implements IAuthRepository {
  private client: SupabaseClient;

  constructor() {
    this.client = supabase;
  }

  async createUser(email: string, password: string): Promise<AuthUser> {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } =
        await this.client.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
        });

      if (authError) {
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      const userId = authData.user.id;
      // MFA settings default handled during enable/disable operations

      // Criar registro adicional na tabela users
      const { error: userError } = await this.client.from('users').insert({
        id: userId,
        email,
        display_name: email.split('@')[0],
        role: 'student',
        username_slug: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mastered_flashcards: 0,
        total_decks: 0,
        total_flashcards: 0,
        active_flashcards: 0,
      });

      if (userError) {
        throw new Error(`Erro ao criar dados do usuário: ${userError.message}`);
      }

      const authUser: AuthUser = {
        uid: userId,
        email,
        email_verified: false,
        disabled: false,
        toJSON: () => ({ uid: userId, email }),
      };

      return authUser;
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async getUserById(userId: string): Promise<AuthUser> {
    try {
      // Buscar dados do usuário no Supabase Auth
      const { data: authData, error: authError } =
        await this.client.auth.admin.getUserById(userId);

      if (authError) {
        throw new Error(`Usuário não encontrado: ${authError.message}`);
      }

      // Buscar dados adicionais na tabela users
      const { data: userData, error: userError } = await this.client
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw new Error(
          `Erro ao buscar dados do usuário: ${userError.message}`,
        );
      }

      return this.mergeUserData(authData.user, userData);
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async getUserByEmail(email: string): Promise<AuthUser> {
    try {
      const { data: userData, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        throw new Error(`Usuário não encontrado: ${error.message}`);
      }

      return await this.getUserById(userData.id);
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async updateUser(userId: string, data: Partial<AuthUser>): Promise<AuthUser> {
    try {
      const updateData: any = {};

      // Atualizar dados no Supabase Auth se necessário
      if (
        data.email ||
        data.email_verified !== undefined ||
        data.disabled !== undefined
      ) {
        const authUpdateData: any = {};
        if (data.email) {
          authUpdateData.email = data.email;
        }
        if (data.email_verified !== undefined) {
          authUpdateData.email_confirm = data.email_verified;
        }
        if (data.disabled !== undefined) {
          authUpdateData.ban_duration = data.disabled ? "876000h" : "none";
        }

        const { error: authError } =
          await this.client.auth.admin.updateUserById(userId, authUpdateData);
        if (authError) {
          throw new Error(
            `Erro ao atualizar usuário no auth: ${authError.message}`,
          );
        }
      }

      // Atualizar dados na tabela users (apenas campos que existem)
      if (data.email) {
        updateData.email = data.email;
      }

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        const { error: userError } = await this.client
          .from('users')
          .update(updateData)
          .eq('id', userId);

        if (userError) {
          throw new Error(
            `Erro ao atualizar dados do usuário: ${userError.message}`,
          );
        }
      }

      return await this.getUserById(userId);
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      // Deletar do Supabase Auth
      const { error: authError } =
        await this.client.auth.admin.deleteUser(userId);
      if (authError) {
        throw new Error(
          `Erro ao deletar usuário do auth: ${authError.message}`,
        );
      }

      // Deletar da tabela users
      const { error: userError } = await this.client
        .from('users')
        .delete()
        .eq('id', userId);

      if (userError) {
        throw new Error(
          `Erro ao deletar dados do usuário: ${userError.message}`,
        );
      }
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async enableMFA(userId: string, type: MFAType): Promise<MFASettings> {
    try {
      const user = await this.getUserById(userId);
      const secret = await this.generateMFASecret(userId, type);
      
      const base: MFASettings = user.mfa_settings || { enabled: false, preferredMethod: MFAType.EMAIL, methods: {} };
      const updatedMfaSettings: MFASettings = {
        ...base,
        enabled: true,
        preferredMethod: type,
        methods: {
          ...base.methods,
          [type]: {
            secret,
            enabled: true,
            backupCodes: this.generateBackupCodes(),
          },
        },
      };

      await this.updateUser(userId, { mfa_settings: updatedMfaSettings });
      return updatedMfaSettings;
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async disableMFA(userId: string, type: MFAType): Promise<MFASettings> {
    try {
      const user = await this.getUserById(userId);
      const base: MFASettings = user.mfa_settings || { enabled: false, preferredMethod: MFAType.EMAIL, methods: {} };
      const updatedMethods = { ...base.methods };
      delete updatedMethods[type];

      const updatedMfaSettings: MFASettings = {
        ...base,
        enabled: Object.keys(updatedMethods).length > 0,
        preferredMethod: base.preferredMethod,
        methods: updatedMethods,
      };

      await this.updateUser(userId, { mfa_settings: updatedMfaSettings });
      return updatedMfaSettings;
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async verifyMFA(
    userId: string,
    type: MFAType,
    code: string,
  ): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      const method = (user.mfa_settings || { methods: {} as any }).methods?.[type];

      if (!method || !method.enabled) {
        return false;
      }

      if (type === MFAType.AUTHENTICATOR && method.secret) {
        return speakeasy.totp.verify({
          secret: method.secret,
          encoding: 'base32',
          token: code,
          window: 2,
        });
      }

      if (type === MFAType.EMAIL && method.backupCodes) {
        return method.backupCodes.includes(code);
      }

      return false;
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async generateMFASecret(_userId: string, _type: MFAType): Promise<string> {
    return speakeasy.generateSecret({
      name: 'MedBrave',
      length: 32,
    }).base32;
  }

  async createCustomToken(userId: string): Promise<string> {
    try {
      // No Supabase, usamos JWT tokens diretamente
      const { data, error } = await this.client.auth.admin.generateLink({
        type: 'magiclink',
        email: (await this.getUserById(userId)).email!,
      });

      if (error) {
        throw new Error(`Erro ao criar token customizado: ${error.message}`);
      }

      return data.properties.action_link;
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async verifyIdToken(token: string): Promise<AuthUser> {
    try {
      const { data, error } = await this.client.auth.getUser(token);

      if (error) {
        throw new Error(`Token inválido: ${error.message}`);
      }

      return await this.getUserById(data.user.id);
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async revokeRefreshTokens(userId: string): Promise<void> {
    try {
      const { error } = await this.client.auth.admin.signOut(userId);
      if (error) {
        throw new Error(`Erro ao revogar tokens: ${error.message}`);
      }
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      // Atualizar lastLogin e updatedAt
      const { error } = await this.client
        .from('users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId);
      
      if (error) {
        throw new Error(`Erro ao atualizar último login: ${error.message}`);
      }
    } catch (error) {
      throw this.handleSupabaseError(error);
    }
  }

  // Métodos simplificados - funcionalidades de MFA/lock não implementadas na estrutura atual
  async incrementFailedLoginAttempts(_userId: string): Promise<number> {
    // Retorna 0 já que não temos essa funcionalidade na estrutura atual
    return 0;
  }

  async resetFailedLoginAttempts(_userId: string): Promise<void> {
    // Método vazio - funcionalidade não implementada na estrutura atual
  }

  async lockAccount(_userId: string, _duration: number): Promise<void> {
    // Método vazio - funcionalidade não implementada na estrutura atual
  }

  async unlockAccount(_userId: string): Promise<void> {
    // Método vazio - funcionalidade não implementada na estrutura atual
  }

  private mergeUserData(authUser: any, _userData: any): AuthUser {
    return {
      uid: authUser.id,
      email: authUser.email,
      email_verified: authUser.email_confirmed_at !== null,
      disabled: authUser.banned_until !== null,
      toJSON: () => ({ uid: authUser.id, email: authUser.email }),
    };
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  private handleSupabaseError(error: any): Error {
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('Erro desconhecido no Supabase');
  }
}
