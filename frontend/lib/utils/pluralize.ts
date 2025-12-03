/**
 * Pluraliza palavras em português
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural || singular + 's'}`;
}

/**
 * Retorna apenas a palavra no singular ou plural (sem o número)
 */
export function pluralizeWord(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return singular;
  }
  return plural || singular + 's';
}

/**
 * Pluralizações específicas comuns
 */
export const pluralizeCommon = {
  questao: (count: number) => pluralize(count, 'questão', 'questões'),
  simulado: (count: number) => pluralize(count, 'simulado', 'simulados'),
  participante: (count: number) => pluralize(count, 'participante', 'participantes'),
  mentorado: (count: number) => pluralize(count, 'mentorado', 'mentorados'),
  mentoria: (count: number) => pluralize(count, 'mentoria', 'mentorias'),
  dia: (count: number) => pluralize(count, 'dia', 'dias'),
  acerto: (count: number) => pluralize(count, 'acerto', 'acertos'),
  erro: (count: number) => pluralize(count, 'erro', 'erros'),
  resposta: (count: number) => pluralize(count, 'resposta', 'respostas'),
};
