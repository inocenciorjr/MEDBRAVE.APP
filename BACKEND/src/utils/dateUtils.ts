 

/**
 * Utilitário centralizado para tratamento de datas no backend
 * Garante consistência no tratamento de diferentes formatos de data
 */
export class DateUtils {
  /**
   * Converte diferentes formatos de data para objeto Date válido
   * @param dateValue - Valor de data em qualquer formato
   * @returns Objeto Date válido ou null se inválido
   */
  static parseDate(dateValue: any): Date | null {
    if (!dateValue) {
      return null;
    }

    try {

      // Timestamp com método toDate()
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }

      // Timestamp com propriedade seconds
      if (dateValue.seconds && typeof dateValue.seconds === 'number') {
        return new Date(dateValue.seconds * 1000);
      }

      // Timestamp com propriedade _seconds
      if (dateValue._seconds && typeof dateValue._seconds === 'number') {
        return new Date(dateValue._seconds * 1000);
      }

      // Objeto Date já válido
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
          return null;
        }
        return dateValue;
      }

      // String de data
      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      }

      // Timestamp numérico
      if (typeof dateValue === 'number') {
        // Se for timestamp em segundos, converter para milissegundos
        const timestamp =
          dateValue > 1000000000000 ? dateValue : dateValue * 1000;
        const parsed = new Date(timestamp);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      }

      return null;
    } catch (error) {
      console.warn('Erro ao processar data:', error, dateValue);
      return null;
    }
  }

  /**
   * Converte data para string ISO de forma segura
   * @param dateValue - Valor de data em qualquer formato
   * @returns String ISO ou null se inválido
   */
  static toISOString(dateValue: any): string | null {
    const date = this.parseDate(dateValue);
    return date ? date.toISOString() : null;
  }

  /**
   * Verifica se uma data é válida
   * @param dateValue - Valor de data em qualquer formato
   * @returns true se a data é válida
   */
  static isValidDate(dateValue: any): boolean {
    return this.parseDate(dateValue) !== null;
  }

  /**
   * Obtém o início do dia (00:00:00.000) para uma data
   * @param date - Data de referência (padrão: hoje)
   * @returns Data com horário zerado
   */
  static getStartOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Obtém o fim do dia (23:59:59.999) para uma data
   * @param date - Data de referência (padrão: hoje)
   * @returns Data com horário no final do dia
   */
  static getEndOfDay(date: Date = new Date()): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Verifica se uma data é hoje
   * @param dateValue - Valor de data em qualquer formato
   * @returns true se a data é hoje
   */
  static isToday(dateValue: any): boolean {
    const date = this.parseDate(dateValue);
    if (!date) {
      return false;
    }

    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Verifica se uma data está dentro de um intervalo
   * @param dateValue - Data a verificar
   * @param startDate - Data de início do intervalo
   * @param endDate - Data de fim do intervalo
   * @returns true se a data está no intervalo
   */
  static isDateInRange(
    dateValue: any,
    startDate: Date,
    endDate: Date,
  ): boolean {
    const date = this.parseDate(dateValue);
    if (!date) {
      return false;
    }

    return date >= startDate && date <= endDate;
  }

  /**
   * Adiciona dias a uma data
   * @param date - Data base
   * @param days - Número de dias a adicionar
   * @returns Nova data com os dias adicionados
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Calcula a diferença em dias entre duas datas
   * @param date1 - Primeira data
   * @param date2 - Segunda data
   * @returns Diferença em dias (absoluta)
   */
  static daysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Formata data para log de debug
   * @param dateValue - Valor de data em qualquer formato
   * @param label - Rótulo para o log
   * @returns String formatada para debug
   */
  static formatForDebug(dateValue: any, label: string = ''): string {
    const date = this.parseDate(dateValue);
    const prefix = label ? `${label}: ` : '';

    if (!date) {
      return `${prefix}INVALID (raw: ${JSON.stringify(dateValue)})`;
    }

    return `${prefix}${date.toISOString()}`;
  }
}
