import { supabase } from '../../../config/supabaseAdmin';
import { IUserRepository, User, CreateUserDTO } from './IUserRepository';
import logger from '../../../utils/logger';

export class SupabaseUserRepository implements IUserRepository {
  async findById(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Erro ao buscar usuário do Supabase:', error);
      return null;
    }

    return data as User | null;
  }

  async create(user: CreateUserDTO): Promise<User> {
    const userData = {
      ...user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      mastered_flashcards: user.mastered_flashcards || 0,
      total_decks: user.total_decks || 0,
      total_flashcards: user.total_flashcards || 0,
      active_flashcards: user.active_flashcards || 0,
    };

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as User;
  }

  async update(userId: string, updateData: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as User;
  }
}
