/**
 * Formata um número como porcentagem
 * - Se for inteiro: mostra sem decimais (ex: 50%)
 * - Se tiver decimal: mostra com 1 casa decimal (ex: 50.5%)
 * - Números menores que 10: adiciona zero à esquerda (ex: 03%)
 */
export function formatPercent(value: number | null | undefined, options?: { padZero?: boolean }): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const isInteger = Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.01;
  const formatted = isInteger ? Math.round(value).toString() : value.toFixed(1);

  // Adicionar zero à esquerda para números menores que 10 (opcional)
  if (options?.padZero && parseFloat(formatted) < 10 && parseFloat(formatted) >= 0) {
    const num = parseFloat(formatted);
    if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < 0.01) {
      return `0${Math.round(num)}%`;
    }
    return `0${num.toFixed(1)}%`;
  }

  return `${formatted}%`;
}

/**
 * Formata porcentagem para exibição em badges/cards (sem padding de zero)
 */
export function formatPercentSimple(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }

  const isInteger = Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.01;
  return isInteger ? `${Math.round(value)}%` : `${value.toFixed(1)}%`;
}
