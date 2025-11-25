import { SupabaseClient } from '@supabase/supabase-js';
import {
  IUserRepository,
  FindUsersOptions,
} from '../../domain/user/repositories/IUserRepository';
import { User, UserRole } from '../../domain/user/entities/User';
import { Result, Success, Failure } from '../../shared/types/Result';

const USERS_TABLE = 'users';

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(user: User, password: string): Promise<Result<User>> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email: user.email,
          password,
          options: {
            data: {
                display_name: user.display_name,
                role: user.user_role,
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
      const userData = {
        id: authData.user.id,
        email: user.email,
        display_name: user.display_name,
          user_role: user.user_role,
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
        .insert(userData);

      if (insertError) {
        // Cleanup auth user if database insert fails
        await this.supabase.auth.admin.deleteUser(authData.user.id);
        return Failure(new Error(insertError.message));
      }

      // Return created user
      return Success(
        User.create({
          id: authData.user.id,
          email: user.email,
          display_name: user.display_name,
          username_slug: user.username_slug || '',
          user_role: user.user_role,
        }).getValue(),
      );
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao criar usuário'),
      );
    }
  }

  async findById(id: string): Promise<Result<User | null>> {
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

      const userProps = {
        id: data.id,
        email: data.email || '',
        display_name: data.display_name || '',
        username_slug: data.username_slug || '',
        user_role: data.user_role || UserRole.STUDENT,
      };

      return Success(User.create(userProps).getValue());
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar usuário'),
      );
    }
  }

  async findByEmail(email: string): Promise<Result<User | null>> {
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

      const userProps = {
        id: data.id,
        email: data.email || '',
        display_name: data.display_name || '',
        username_slug: data.username_slug || '',
        user_role: data.user_role || UserRole.STUDENT,
      };

      return Success(User.create(userProps).getValue());
    } catch (error) {
      return Failure(
        error instanceof Error
          ? error
          : new Error('Erro ao buscar usuário por email'),
      );
    }
  }

  async findUsers(
    options: FindUsersOptions,
  ): Promise<Result<{ users: User[]; total: number }>> {
    try {
      let query = this.supabase
        .from(USERS_TABLE)
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.searchTerm) {
        query = query.or(`email.ilike.%${options.searchTerm}%,displayName.ilike.%${options.searchTerm}%`);
      }

      if (options.user_role) {
        query = query.eq('user_role', options.user_role);
      }

      // Note: isActive column doesn't exist in current schema
      // if (options.isActive !== undefined) {
      //   query = query.eq('isActive', options.isActive);
      // }

      // Apply sorting
      if (options.sortBy) {
        const direction = options.sortDirection === 'desc' ? false : true;
        query = query.order(options.sortBy, { ascending: direction });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error, count } = await query;

      if (error) {
        return Failure(new Error(error.message));
      }

      const users = (data || []).map((userData) => {
        const userProps = {
          id: userData.id,
          email: userData.email || '',
          display_name: userData.display_name || '',
          username_slug: userData.username_slug || '',
          user_role: userData.user_role || UserRole.STUDENT,
        };
        return User.create(userProps).getValue();
      });

      return Success({
        users,
        total: count || 0,
      });
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao buscar usuários'),
      );
    }
  }

  async update(id: string, userData: Partial<User>): Promise<Result<User>> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (userData.email) {
        updateData.email = userData.email;
      }
      if (userData.display_name) {
        updateData.display_name = userData.display_name;
      }
      if (userData.user_role) {
        updateData.user_role = userData.user_role;
      }

      const { data, error } = await this.supabase
        .from(USERS_TABLE)
        .update(updateData)
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
      if (userData.email) {
        await this.supabase.auth.admin.updateUserById(id, {
          email: userData.email,
        });
      }

      const userProps = {
        id: data.id,
        email: data.email || '',
        display_name: data.display_name || '',
        username_slug: data.username_slug || '',
        user_role: data.user_role || UserRole.STUDENT,
      };

      return Success(User.create(userProps).getValue());
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao atualizar usuário'),
      );
    }
  }

  async delete(id: string): Promise<Result<void>> {
    try {
      // Delete from auth
      const { error: authError } =
        await this.supabase.auth.admin.deleteUser(id);
      if (authError) {
        return Failure(new Error(authError.message));
      }

      // Delete from users table
      const { error } = await this.supabase
        .from(USERS_TABLE)
        .delete()
        .eq('id', id);

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

  async disable(id: string): Promise<Result<void>> {
    try {
      // Disable in auth
      const { error: authError } =
        await this.supabase.auth.admin.updateUserById(id, {
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
        .eq('id', id);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error
          ? error
          : new Error('Erro ao desabilitar usuário'),
      );
    }
  }

  async enable(id: string): Promise<Result<void>> {
    try {
      // Enable in auth (remove ban)
      const { error: authError } =
        await this.supabase.auth.admin.updateUserById(id, {
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
        .eq('id', id);

      if (error) {
        return Failure(new Error(error.message));
      }

      return Success(undefined);
    } catch (error) {
      return Failure(
        error instanceof Error ? error : new Error('Erro ao habilitar usuário'),
      );
    }
  }
}

// Create and export singleton instance
export const userRepository = new SupabaseUserRepository(
  // Supabase client would be injected here
  {} as SupabaseClient,
);
