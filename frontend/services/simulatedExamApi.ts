// Serviço REST para Simulados
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE = '/simulatedexams';

export async function getAllSimulatedExams() {
  console.log('🔍 getAllSimulatedExams - Iniciando requisição para:', API_BASE);
  
  try {
    const res = await fetchWithAuth(`${API_BASE}`);
    console.log('📡 getAllSimulatedExams - Resposta recebida:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ getAllSimulatedExams - Erro na resposta:', errorText);
      throw new Error('Erro ao buscar simulados');
    }
    
    const data = await res.json();
    console.log('✅ getAllSimulatedExams - Dados recebidos:', data);
    return data;
  } catch (error) {
    console.error('💥 getAllSimulatedExams - Erro capturado:', error);
    throw error;
  }
}

export async function getSimulatedExamById(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Erro ao buscar simulado');
  return res.json();
}

export async function createSimulatedExam(data: any) {
  console.log('🚀 createSimulatedExam - Iniciando para:', API_BASE);
  console.log('📦 createSimulatedExam - Dados:', data);
  
  const res = await fetchWithAuth(`${API_BASE}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  console.log('📡 createSimulatedExam - Status da resposta:', res.status);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ createSimulatedExam - Erro na resposta:', errorText);
    throw new Error('Erro ao criar simulado');
  }
  
  const result = await res.json();
  console.log('✅ createSimulatedExam - Resultado:', result);
  return result;
}

export async function updateSimulatedExam(id: string, data: any) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erro ao atualizar simulado');
  return res.json();
}

export async function deleteSimulatedExam(id: string) {
  const res = await fetchWithAuth(`${API_BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao deletar simulado');
  return res.json();
}

export async function startSimulatedExam(id: string, user_id: string, config: any) {
  const res = await fetchWithAuth(`${API_BASE}/${id}/start`, {
    method: 'POST',
    body: JSON.stringify({ user_id, ...config }),
  });
  if (!res.ok) throw new Error('Erro ao iniciar simulado');
  return res.json();
}

export async function submitSimulatedExamAnswer(resultId: string, answer: any) {
  const res = await fetchWithAuth(`${API_BASE}/results/${resultId}/answer`, {
    method: 'POST',
    body: JSON.stringify(answer),
  });
  if (!res.ok) throw new Error('Erro ao enviar resposta');
  return res.json();
}

export async function finishSimulatedExam(resultId: string) {
  const res = await fetchWithAuth(`${API_BASE}/results/${resultId}/finish`, {
    method: 'POST' });
  if (!res.ok) throw new Error('Erro ao finalizar simulado');
  return res.json();
}