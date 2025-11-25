// Serviço REST para Respostas de Questões
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE = '/question-responses';

export async function createQuestionResponse(data: any) {
  const res = await fetchWithAuth(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao enviar resposta');
  return res.json();
}

export async function getQuestionResponseById(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar resposta');
  return res.json();
}

export async function getAllQuestionResponses() {
  const res = await fetchWithAuth(`${API_BASE}`);
  if (!res.ok) throw new Error('Erro ao buscar respostas');
  return res.json();
}

export async function getQuestionResponsesByQuestionId(question_id: string) {
  const res = await fetchWithAuth(`${API_BASE}/question/${question_id}`);
  if (!res.ok) throw new Error('Erro ao buscar respostas da questão');
  return res.json();
}

export async function reviewQuestionResponse(responseId: string, quality: number) {
  const res = await fetchWithAuth(`${API_BASE}/${responseId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quality }),
  });
  if (!res.ok) throw new Error('Erro ao registrar revisão');
  return res.json();
}