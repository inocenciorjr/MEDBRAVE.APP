// Serviço REST para Subfiltros de Questões
import { fetchWithAuth } from './fetchWithAuth';

export async function fetchSubFilters(filterId: string) {
  if (!filterId) throw new Error('filterId é obrigatório');
  const res = await fetchWithAuth(`/filters/${filterId}/subfilters`);
  if (!res.ok) throw new Error('Erro ao buscar subfiltros');
  return res.json();
}

// Exemplo de uso:
// const subfilters = await fetchSubFilters('id-do-filtro-pai');