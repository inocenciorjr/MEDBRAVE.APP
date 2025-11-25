import { SupabaseClient } from '@supabase/supabase-js';
import { IUserService, PaginatedUsersResult } from '../../domain/user/services/IUserService';
import { User, UserRole } from '../../domain/user/entities/User';
import { Result, Success, Failure } from '../../shared/types/Result';
import {
  LoginCredentials,
  CreateUserData,
  UpdateUserData
} from '../../domain/user/types/index';

const USERS_TABLE = 'users';

export class SupabaseUserService implements IUserService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createUser(userData: CreateUserData): Promise<Result<User>> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
            display_name: userData.display_name,
            user_role: (userData.user_role as UserRole) || UserRole.STUDENT,
          },
          },
        });

      if (authError || !authData.user) {
        return Failure(
          new Error(authError?.message || 'Erro ao criar usuário'),
        );
      }

      const now = new Date().toISOString();

      // Save user data in users table
      const userRecord = {
        id: authData.user.id,
        email: userData.email,
        display_name: userData.display_name,
        username_slug: userData.username_slug || '',
        user_role: (userData.user_role as UserRole) || UserRole.STUDENT,
        created_at: now,
        updated_at: now,
        last_login: now,
        mastered_flashcards: 0,
        total_decks: 0,
        total_flashcards: 0,
        active_flashcards: 0,
      };

      const { error: insertError } = await this.supabase
        .from(USERS_TABLE)
        .insert(userRecord);

      if (insertError) {
        // Cleanup auth user if database insert fails
        await this.supabase.auth.admin.deleteUser(authData.user.id);
        return Failure(new Error(insertError.message));
      }

      // Return created user
      return Success(
        User.create({
          id: authData.user.id,
          email: userData.email,
          display_name: userData.display_name,
          username_slug: userData.username_slug || '',
          user_role: (userData.user_role as UserRole) || UserRole.STUDENT,
        }).getValue(),
      );
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao criar usuário'),
      );
    }
  }

  async loginUser(
    credentials: LoginCredentials,
  ): Promise<
    Result<{ user: User; accessToken: string; refreshToken: string }>
  > {
    try {
      const { data: authData, error: authError } =
        await this.supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

      if (authError || !authData.user || !authData.session) {
        return Failure(
          new Error(authError?.message || 'Credenciais inválidas'),
        );
      }

      // Update last login
      await this.supabase
        .from(USERS_TABLE)
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id);

      // Get user data from database
      const { data: userData, error: userError } = await this.supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        return Failure(new Error('Erro ao buscar dados do usuário'));
      }

      // Check if user is active
      if (!userData.isActive) {
        return Failure(new Error('Usuário desativado'));
      }

      const user = User.create({
        id: userData.id,
        email: userData.email,
        display_name: userData.display_name,
        username_slug: userData.username_slug || '',
        user_role: userData.user_role as UserRole,
      }).getValue();

      return Success({
        user,
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao fazer login'),
      );
    }
  }

  async updateUser(
    id: string,
    updateData: UpdateUserData,
  ): Promise<Result<User>> {
    try {
      const updateRecord: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.email) {
        updateRecord.email = updateData.email;
      }
      if (updateData.display_name) {
        updateRecord.display_name = updateData.display_name;
      }
      // Não atualizar user_role na tabela users - usar apenas raw_user_meta_data

      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .update(updateRecord)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return Failure(new Error(error.message));
      }

      if (!data) {
        return Failure(new Error('Usuário não encontrado'));
      }

      // Update auth user if email changed
      if (updateData.email) {
        await this.supabase.auth.admin.updateUserById(id, {
          email: updateData.email,
        });
      }

      // Obter role do raw_user_meta_data ao invés da tabela users
      const { data: authUser } = await this.supabase.auth.admin.getUserById(data.id);
      const userRoleFromMetadata = authUser.user?.user_metadata?.role;
      const user_role = userRoleFromMetadata ? String(userRoleFromMetadata).toUpperCase() : 'STUDENT';

      const user = User.create({
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        username_slug: data.username_slug || '',
        user_role: user_role as UserRole,
      }).getValue();

      return Success(user);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao atualizar usuário'),
      );
    }
  }

  async getUserById(id: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Success(null);
        }
        return Failure(new Error(error.message));
      }

      if (!data) {
        return Success(null);
      }

      // Obter role do raw_user_meta_data ao invés da tabela users
      const { data: authUser } = await this.supabase.auth.admin.getUserById(data.id);
      const userRoleFromMetadata = authUser.user?.user_metadata?.role;
      const user_role = userRoleFromMetadata ? String(userRoleFromMetadata).toUpperCase() : 'STUDENT';

      const user = User.create({
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        username_slug: data.username_slug || '',
        user_role: user_role as UserRole,
      }).getValue();

      return Success(user);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar usuário'),
      );
    }
  }

  async getUserByEmail(email: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Success(null);
        }
        return Failure(new Error(error.message));
      }

      if (!data) {
        return Success(null);
      }

      // Obter role do raw_user_meta_data ao invés da tabela users
      const { data: authUser } = await this.supabase.auth.admin.getUserById(data.id);
      const userRoleFromMetadata = authUser.user?.user_metadata?.role;
      const user_role = userRoleFromMetadata ? String(userRoleFromMetadata).toUpperCase() : 'STUDENT';

      const user = User.create({
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        username_slug: data.username_slug || '',
        user_role: user_role as UserRole,
      }).getValue();

      return Success(user);
    } catch (error) {
      return Failure(
        error instanceof Error
          ? error
          : new Error('Erro ao buscar usuário por email'),
      );
    }
  }

  async getUserByUsername(username: string): Promise<Result<User | null>> {
    try {
      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .select('*')
        .eq('username_slug', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return Success(null);
        }
        return Failure(new Error(error.message));
      }

      if (!data) {
        return Success(null);
      }

      // Obter role do raw_user_meta_data ao invés da tabela users
      const { data: authUser } = await this.supabase.auth.admin.getUserById(data.id);
      const userRoleFromMetadata = authUser.user?.user_metadata?.role;
      const user_role = userRoleFromMetadata ? String(userRoleFromMetadata).toUpperCase() : 'STUDENT';

      const user = User.create({
        id: data.id,
        email: data.email,
        display_name: data.display_name,
        username_slug: data.username_slug || '',
        user_role: user_role as UserRole,
      }).getValue();

      return Success(user);
    } catch (error) {
      return Failure(
        error instanceof Error
          ? error
          : new Error('Erro ao buscar usuário por username'),
      );
    }
  }

  async enableMFA(
    _userId: string,
  ): Promise<Result<{ qrCode: string; secret: string }>> {
    try {
      
      // This would need to be implemented with a third-party library like speakeasy
      // For now, returning a placeholder implementation
      return Failure(new Error('MFA não implementado para Supabase'));
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao habilitar MFA'),
      );
    }
  }

  async verifyMFA(_userId: string, _token: string): Promise<Result<boolean>> {
    try {
      // Placeholder implementation
      return Failure(new Error('MFA não implementado para Supabase'));
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao verificar MFA'),
      );
    }
  }

  async disableMFA(_userId: string): Promise<Result<void>> {
    try {
      // Placeholder implementation
      return Failure(new Error('MFA não implementado para Supabase'));
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao desabilitar MFA'),
      );
    }
  }

  async deactivateUser(userId: string): Promise<Result<void>> {
    try {
      // Disable in auth
      const { error: authError } =
        await this.supabase.auth.admin.updateUserById(userId, {
          ban_duration: 'none', // Permanently ban
        });

      if (authError) {
        return Failure(new Error(authError.message));
      }

      // Update in users table
      const { error } = await this.supabase
        .from(USERS_TABLE)
        .update({
          // Note: isActive column doesn't exist in current schema
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao desativar usuário'),
      );
    }
  }

  async activateUser(userId: string): Promise<Result<void>> {
    try {
      // Enable in auth (remove ban)
      const { error: authError } =
        await this.supabase.auth.admin.updateUserById(userId, {
          ban_duration: '0s', // Remove ban
        });

      if (authError) {
        return Failure(new Error(authError.message));
      }

      // Update in users table
      const { error } = await this.supabase
        .from(USERS_TABLE)
        .update({
          // Note: isActive column doesn't exist in current schema
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao ativar usuário'),
      );
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<Result<{ accessToken: string; refreshToken: string }>> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return Failure(new Error(error?.message || 'Erro ao renovar token'));
      }

      return Success({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao renovar token'),
      );
    }
  }

  async verifyToken(token: string): Promise<Result<boolean>> {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        return Failure(new Error(error?.message || 'Token inválido'));
      }

      // Check if user exists in database and is active
      const { data: userData, error: userError } = await this.supabase
        .from(USERS_TABLE)
        .select('id, is_active')
        .eq('id', data.user.id)
        .single();

      if (userError || !userData) {
        return Failure(new Error('Usuário não encontrado'));
      }

      if (userData.is_active === false) {
        return Failure(new Error('Usuário desativado'));
      }

      return Success(true);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao verificar token'),
      );
    }
  }

  async revokeToken(userId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.admin.signOut(userId);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao revogar token'),
      );
    }
  }

  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao alterar senha'),
      );
    }
  }

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao resetar senha'),
      );
    }
  }

  async deleteUser(userId: string): Promise<Result<void>> {
    try {
      // Delete from auth
      const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);

      if (authError) {
        return Failure(new Error(authError.message));
      }

      // Delete from users table
      const { error } = await this.supabase
        .from(USERS_TABLE)
        .delete()
        .eq('id', userId);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao deletar usuário'),
      );
    }
  }

  async listUsers(filters?: any, pagination?: { limit?: number; page?: number }): Promise<Result<PaginatedUsersResult>> {
    try {
      let query = this.supabase
        .from(USERS_TABLE)
        .select('*', { count: 'exact' });

      if (filters?.user_role) {
        query = query.eq('user_role', filters.user_role);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const limit = pagination?.limit || 10;
      const offset = ((pagination?.page || 1) - 1) * limit;

      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        return Failure(new Error(error.message));
      }

      const users = data.map(userData => 
        User.create({
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          username_slug: userData.username_slug || '',
          user_role: userData.user_role as UserRole,
        }).getValue()
      );

      return Success({
        users,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao listar usuários'),
      );
    }
  }

  async getUserStats(userId: string): Promise<Result<{
    total_decks: number;
    total_flashcards: number;
    // total_study_sessions: number; // Removed
    last_activity: string | null;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .select('total_decks, total_flashcards, last_login')
        .eq('id', userId)
        .single();

      if (error) {
        return Failure(new Error(error.message));
      }

      if (!data) {
        return Failure(new Error('Usuário não encontrado'));
      }

      return Success({
        total_decks: data.total_decks || 0,
        total_flashcards: data.total_flashcards || 0,
        // total_study_sessions: 0, // TODO: Implementar contagem de sessões de estudo // Removed
        last_activity: data.last_login,
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar estatísticas do usuário'),
      );
    }
  }

  async updateLastActivity(userId: string): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from(USERS_TABLE)
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao atualizar última atividade'),
      );
    }
  }

  async getUserPreferences(userId: string): Promise<Result<any>> {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return empty preferences
          return Success({
            theme: 'light',
            language: 'pt-BR',
            notifications: true,
            emailNotifications: true,
          });
        }
        return Failure(new Error(error.message));
      }

      return Success(data.preferences || {});
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar preferências do usuário'),
      );
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<Result<void>> {
    try {
      const { error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao atualizar preferências do usuário'),
      );
    }
  }
}

// Create and export singleton instance
export const userService = new SupabaseUserService(
  // Supabase client would be injected here
  {} as SupabaseClient,
);


