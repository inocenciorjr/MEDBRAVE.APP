import api from '@/services/api';

export interface UpdateNote {
  id: string;
  title: string;
  content: string;
  created_by: string;
  filter_ids: string[];
  sub_filter_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_updated_date: string;
  creator_name?: string;
}

export interface CreateUpdateNoteDTO {
  title: string;
  content: string;
  filter_ids: string[];
  sub_filter_ids: string[];
}

export interface UpdateUpdateNoteDTO {
  title?: string;
  content?: string;
  filter_ids?: string[];
  sub_filter_ids?: string[];
  is_active?: boolean;
  last_updated_date?: string;
}

/**
 * Buscar notas aplicáveis a uma questão
 */
export async function getNotesForQuestion(questionId: string): Promise<UpdateNote[]> {
  try {
    const response = await api.get(`/update-notes/question/${questionId}`);
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar notas para questão:', error);
    return [];
  }
}

/**
 * Buscar todas as notas (admin)
 */
export async function getAllUpdateNotes(includeInactive: boolean = false): Promise<UpdateNote[]> {
  try {
    const response = await api.get('/update-notes', {
      params: { includeInactive },
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    throw error;
  }
}

/**
 * Buscar nota por ID (admin)
 */
export async function getUpdateNoteById(noteId: string): Promise<UpdateNote> {
  try {
    const response = await api.get(`/update-notes/${noteId}`);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao buscar nota:', error);
    throw error;
  }
}

/**
 * Criar uma nova nota (admin)
 */
export async function createUpdateNote(data: CreateUpdateNoteDTO): Promise<UpdateNote> {
  try {
    const response = await api.post('/update-notes', data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    throw error;
  }
}

/**
 * Atualizar uma nota (admin)
 */
export async function updateUpdateNote(
  noteId: string,
  data: UpdateUpdateNoteDTO
): Promise<UpdateNote> {
  try {
    const response = await api.put(`/update-notes/${noteId}`, data);
    return response.data.data;
  } catch (error) {
    console.error('Erro ao atualizar nota:', error);
    throw error;
  }
}

/**
 * Deletar uma nota (admin)
 */
export async function deleteUpdateNote(noteId: string): Promise<void> {
  try {
    await api.delete(`/update-notes/${noteId}`);
  } catch (error) {
    console.error('Erro ao deletar nota:', error);
    throw error;
  }
}

/**
 * Buscar questões que se aplicam a uma nota (admin)
 */
export async function getQuestionsForNote(noteId: string): Promise<any[]> {
  try {
    const response = await api.get(`/update-notes/${noteId}/questions`);
    return response.data.data || [];
  } catch (error) {
    console.error('Erro ao buscar questões para nota:', error);
    throw error;
  }
}
