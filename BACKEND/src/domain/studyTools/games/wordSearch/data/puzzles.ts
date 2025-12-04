import { IPuzzleData } from '../interfaces/IWordSearch';

// Lista de puzzles sobre atualizações em protocolos médicos
// Cada puzzle tem um título, texto contextual explicando a atualização e palavras-chave
// Use **texto** para negrito em pontos importantes (não são palavras a buscar)
// As palavras em MAIÚSCULO no array words serão destacadas para o usuário encontrar
export const MEDICAL_PUZZLES: IPuzzleData[] = [
  {
    title: 'Atualização ATLS 11ª Edição',
    contextText: `Na **11ª edição** do ATLS, a avaliação primária do politraumatizado mudou de **ABCDE para XABCDE**, priorizando o CONTROLE imediato de hemorragias exsanguinantes (X) ANTES da via aérea (A).

**Nova sequência:**
• **X:** HEMOSTASIA de sangramentos externos graves (compressão, packing, torniquetes)
• **A:** via aérea com proteção cervical
• **B:** respiração
• **C:** circulação e controle de outras hemorragias
• **D:** estado neurológico
• **E:** exposição e prevenção de hipotermia

Evidências de registros brasileiros mostram que **30-50% das mortes** EVITAVEIS nas primeiras horas de trauma decorrem de hemorragia externa compressível em membros ou junções. Por isso, a 11ª edição do ATLS adota os princípios do **TCCC e PHTLS**: em sangramentos catastróficos visíveis, **segundos decidem**. Coloca o controle imediato (X) antes da via aérea, tornando a hemostasia externa a PRIORIDADE absoluta.`,
    words: ['CONTROLE', 'ANTES', 'HEMOSTASIA', 'EVITAVEIS', 'PRIORIDADE'],
  },
  // Adicione mais puzzles aqui conforme receber as frases
];

// Função para obter puzzle do dia baseado na data
export function getDailyPuzzle(date: Date = new Date()): IPuzzleData & { date: string } {
  const startDate = new Date('2024-01-01');
  const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const puzzleIndex = Math.abs(daysSinceStart) % MEDICAL_PUZZLES.length;
  const dateStr = date.toISOString().split('T')[0];

  return {
    ...MEDICAL_PUZZLES[puzzleIndex],
    date: dateStr,
  };
}
