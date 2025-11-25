// Serviço REST para Listas de Questões (Migrado para sistema unificado)
const API_BASE = '/questions'; // Migrado para sistema unificado
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

export async function getAllQuestionLists() {
  const res = await fetchWithAuth(`${API_BASE}`);
  if (!res.ok) throw new Error('Erro ao buscar listas de questões');
  return res.json();
}

export async function getQuestionListById(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar lista de questões');
  return res.json();
}

export type QuestionListStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

export interface CreateQuestionListPayload {
  title: string;
  name?: string;
  description?: string | null;
  isPublic?: boolean;
  tags?: string[];
  status?: QuestionListStatus;
}

export async function createQuestionList(payload: CreateQuestionListPayload) {
  const res = await fetchWithAuth(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erro ao criar lista de questões');
  return res.json();
}

export interface CreateQuestionListItemPayload {
  questionListId: string;
  questionId: string;
  order: number;
  personalNotes?: string | null;
}

export async function addQuestionToList(payload: CreateQuestionListItemPayload) {
  const res = await fetchWithAuth(`${API_BASE}/lists/${payload.questionListId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_id: payload.questionId,
      order: payload.order,
      personal_notes: payload.personalNotes,
    }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erro ao adicionar questão à lista');
  return res.json();
}

export async function updateQuestionList(id: string, data: any) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar lista de questões');
  return res.json();
}

export async function deleteQuestionList(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao deletar lista de questões');
  return res.json();
}