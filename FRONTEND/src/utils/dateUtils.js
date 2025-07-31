/**
 * Converte diferentes formatos de data do Firestore para objeto Date válido
 * @param {any} dateValue - Valor de data em qualquer formato do Firestore
 * @returns {Date} - Objeto Date válido ou data atual como fallback
 */
export const parseFirestoreDate = (dateValue) => {
  if (!dateValue) {
    return new Date(); // Fallback para data atual
  }

  try {
    // Timestamp do Firestore com método toDate()
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
        return new Date(); // Fallback se Date inválido
      }
      return dateValue;
    }
    
    // String de data
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) {
        return new Date(); // Fallback se string inválida
      }
      return parsed;
    }
    
    // Timestamp numérico
    if (typeof dateValue === 'number') {
      // Se for timestamp em segundos, converter para milissegundos
      const timestamp = dateValue > 1000000000000 ? dateValue : dateValue * 1000;
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        return new Date(); // Fallback se timestamp inválido
      }
      return parsed;
    }
    
    // Fallback para qualquer outro tipo
    return new Date();
  } catch (error) {
    console.warn('Erro ao processar data do Firestore:', error, dateValue);
    return new Date(); // Fallback em caso de erro
  }
};

/**
 * Formata data com rótulos em português (HOJE, ONTEM, etc.)
 * @param {any} date - Data em qualquer formato
 * @returns {string} - Data formatada com rótulos
 */
export const formatDateWithLabels = (date) => {
  const parsedDate = parseFirestoreDate(date);
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Verificar se é hoje
  if (parsedDate.toDateString() === today.toDateString()) {
    return 'HOJE';
  }
  
  // Verificar se é ontem
  if (parsedDate.toDateString() === yesterday.toDateString()) {
    return 'ONTEM';
  }
  
  // Verificar se é amanhã
  if (parsedDate.toDateString() === tomorrow.toDateString()) {
    return 'AMANHÃ';
  }
  
  // Caso contrário, retornar a data formatada
  return parsedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formata data e hora de forma segura
 * @param {any} date - Data em qualquer formato
 * @param {object} options - Opções de formatação
 * @returns {string} - Data e hora formatadas
 */
export const formatDateTime = (date, options = {}) => {
  const parsedDate = parseFirestoreDate(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return parsedDate.toLocaleString('pt-BR', defaultOptions);
};

/**
 * Formata apenas a data de forma segura
 * @param {any} date - Data em qualquer formato
 * @returns {string} - Data formatada
 */
export const formatDate = (date) => {
  const parsedDate = parseFirestoreDate(date);
  return parsedDate.toLocaleDateString('pt-BR');
};

/**
 * Formata data de forma longa com dia da semana
 * @param {any} date - Data em qualquer formato
 * @returns {string} - Data formatada de forma longa
 */
export const formatDateLong = (date) => {
  const parsedDate = parseFirestoreDate(date);
  return parsedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formata apenas o horário de forma segura
 * @param {any} date - Data em qualquer formato
 * @returns {string} - Horário formatado
 */
export const formatTime = (date) => {
  const parsedDate = parseFirestoreDate(date);
  return parsedDate.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Função para verificar se uma data é hoje
export const isToday = (date) => {
  if (!date) return false;
  const targetDate = parseFirestoreDate(date);
  const today = new Date();
  return targetDate.toDateString() === today.toDateString();
};

// Função para verificar se uma data é ontem
export const isYesterday = (date) => {
  if (!date) return false;
  const targetDate = parseFirestoreDate(date);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return targetDate.toDateString() === yesterday.toDateString();
};

// Função para verificar se uma data é amanhã
export const isTomorrow = (date) => {
  if (!date) return false;
  const targetDate = parseFirestoreDate(date);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return targetDate.toDateString() === tomorrow.toDateString();
};