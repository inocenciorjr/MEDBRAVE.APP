import { SupabaseClient } from '@supabase/supabase-js';
import {
  UpdateNote,
  CreateUpdateNoteDTO,
  UpdateUpdateNoteDTO,
} from '../types/comments';
import logger from '../../../utils/logger';

export class UpdateNoteService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Criar uma nova nota de atualização
   */
  async createUpdateNote(
    userId: string,
    data: CreateUpdateNoteDTO
  ): Promise<UpdateNote> {
    try {
      const noteData = {
        title: data.title,
        content: data.content,
        created_by: userId,
        filter_ids: JSON.stringify(data.filter_ids || []),
        sub_filter_ids: JSON.stringify(data.sub_filter_ids || []),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_updated_date: new Date().toISOString(),
      };

      const { data: note, error } = await this.supabase
        .from('update_notes')
        .insert(noteData)
        .select()
        .single();

      if (error) throw error;

      return this.formatUpdateNote(note);
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao criar nota:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as notas de atualização (admin)
   */
  async getAllUpdateNotes(includeInactive: boolean = false): Promise<UpdateNote[]> {
    try {
      let query = this.supabase
        .from('update_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: notes, error } = await query;

      if (error) throw error;

      return (notes || []).map((note) => this.formatUpdateNote(note));
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao buscar notas:', error);
      throw error;
    }
  }

  /**
   * Buscar nota por ID
   */
  async getUpdateNoteById(noteId: string): Promise<UpdateNote | null> {
    try {
      const { data: note, error } = await this.supabase
        .from('update_notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;
      if (!note) return null;

      return this.formatUpdateNote(note);
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao buscar nota:', error);
      throw error;
    }
  }

  /**
   * Buscar notas aplicáveis a uma questão
   */
  async getNotesForQuestion(questionId: string): Promise<UpdateNote[]> {
    try {
      // Buscar a questão para obter seus filtros
      const { data: question, error: questionError } = await this.supabase
        .from('questions')
        .select('filter_ids, sub_filter_ids')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;
      if (!question) return [];

      const questionFilterIds = question.filter_ids || [];
      const questionSubFilterIds = question.sub_filter_ids || [];

      // Buscar todas as notas ativas
      const { data: notes, error } = await this.supabase
        .from('update_notes')
        .select('*')
        .eq('is_active', true)
        .order('last_updated_date', { ascending: false });

      if (error) throw error;

      // Filtrar notas que se aplicam à questão
      const applicableNotes = (notes || []).filter((note) => {
        const noteFilterIds = note.filter_ids || [];
        const noteSubFilterIds = note.sub_filter_ids || [];

        // Verificar se há interseção entre os filtros
        const hasMatchingFilter = noteFilterIds.some((filterId: string) =>
          questionFilterIds.includes(filterId)
        );

        const hasMatchingSubFilter = noteSubFilterIds.some((subFilterId: string) =>
          questionSubFilterIds.includes(subFilterId)
        );

        // A nota se aplica se houver match em filtros OU subfiltros
        return hasMatchingFilter || hasMatchingSubFilter;
      });

      return applicableNotes.map((note) => this.formatUpdateNote(note));
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao buscar notas para questão:', error);
      throw error;
    }
  }

  /**
   * Atualizar uma nota
   */
  async updateUpdateNote(
    noteId: string,
    data: UpdateUpdateNoteDTO
  ): Promise<UpdateNote> {
    try {
      const updateData: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      if (data.filter_ids) {
        updateData.filter_ids = JSON.stringify(data.filter_ids);
      }

      if (data.sub_filter_ids) {
        updateData.sub_filter_ids = JSON.stringify(data.sub_filter_ids);
      }

      if (data.last_updated_date) {
        updateData.last_updated_date = data.last_updated_date;
      }

      const { data: note, error } = await this.supabase
        .from('update_notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      return this.formatUpdateNote(note);
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao atualizar nota:', error);
      throw error;
    }
  }

  /**
   * Deletar uma nota (soft delete)
   */
  async deleteUpdateNote(noteId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('update_notes')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', noteId);

      if (error) throw error;
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao deletar nota:', error);
      throw error;
    }
  }

  /**
   * Buscar questões que se aplicam a uma nota
   */
  async getQuestionsForNote(noteId: string): Promise<any[]> {
    try {
      const note = await this.getUpdateNoteById(noteId);
      if (!note) return [];

      const filterIds = note.filter_ids || [];
      const subFilterIds = note.sub_filter_ids || [];

      if (filterIds.length === 0 && subFilterIds.length === 0) {
        return [];
      }

      // Buscar questões que tenham pelo menos um dos filtros ou subfiltros
      const { data: questions, error } = await this.supabase
        .from('questions')
        .select('id, title, content, filter_ids, sub_filter_ids')
        .or(
          `filter_ids.cs.{${filterIds.join(',')}},sub_filter_ids.cs.{${subFilterIds.join(',')}}`
        )
        .limit(100);

      if (error) throw error;

      return questions || [];
    } catch (error) {
      logger.error('[UpdateNoteService] Erro ao buscar questões para nota:', error);
      throw error;
    }
  }

  private formatUpdateNote(note: any): UpdateNote {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      created_by: note.created_by,
      filter_ids: typeof note.filter_ids === 'string' 
        ? JSON.parse(note.filter_ids) 
        : (note.filter_ids || []),
      sub_filter_ids: typeof note.sub_filter_ids === 'string'
        ? JSON.parse(note.sub_filter_ids)
        : (note.sub_filter_ids || []),
      is_active: note.is_active,
      created_at: note.created_at,
      updated_at: note.updated_at,
      last_updated_date: note.last_updated_date,
    };
  }
}
