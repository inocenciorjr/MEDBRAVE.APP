// API para buscar filtros de questões
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

const API_BASE = '/filters';

export async function fetchFilters() {
  const res = await fetchWithAuth(API_BASE);
  if (!res.ok) throw new Error('Erro ao buscar filtros');
  return res.json();
}

// Exemplo de uso:
// const filters = await fetchFilters();