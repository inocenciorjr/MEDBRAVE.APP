/**
 * Utilitários para geração de IDs padronizados no frontend
 * Versão adaptada do backend para uso no frontend
 */

/**
 * Função para sanitizar texto para uso em IDs
 */
export const sanitizeForId = (text: string): string => (text || 'user')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '') // remove acentos
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .substring(0, 20);

/**
 * Gera um sufixo aleatório de 6 caracteres (letras e números)
 */
const generateRandomSuffix = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Gera um ID padronizado para uma questão baseado no enunciado
 * Formato: primeiras20letras-SUFIXO6
 * Exemplo: "umhomemde45anos-XYZ47D"
 */
export const generateQuestionId = (statement: string): string => {
  if (!statement || typeof statement !== 'string') {
    throw new Error('Enunciado da questão é obrigatório para gerar ID');
  }

  // Sanitizar as primeiras 20 letras do enunciado
  const sanitizedStatement = sanitizeForId(statement);
  
  // Gerar sufixo aleatório
  const randomSuffix = generateRandomSuffix();
  
  // Retornar no formato: enunciado-sufixo
  return `${sanitizedStatement}-${randomSuffix}`;
};

/**
 * Gera um ID padronizado para resposta de questão
 * Versão simplificada para frontend (sem busca no Firestore)
 */
export const generateQuestionResponseId = (userId: string, questionId: string): string => {
  // Usar timestamp para garantir unicidade
  const timestamp = Date.now();
  
  // Sanitizar userId para usar como slug
  const userSlug = sanitizeForId(userId);
  
  // Gerar ID no formato: userSlug_questionId_timestamp
  return `${userSlug}_${questionId}_${timestamp}`;
};

/**
 * Gera um ID padronizado para retenção de questão
 */
export const generateQuestionRetentionId = (userId: string, questionId: string): string => {
  // Formato simples: userId_questionId (como já estava sendo usado)
  return `${userId}_${questionId}`;
};

/**
 * Gera um ID padronizado para um flashcard
 * Versão simplificada para frontend
 */
export const generateFlashcardId = (userId: string, deckId: string, index: number): string => {
  const userSlug = sanitizeForId(userId);
  const deckSlug = sanitizeForId(deckId);
  
  // Gerar ID no formato: userSlug_deckSlug_index
  return `${userSlug}_${deckSlug}_${index}`;
};

/**
 * Gera um ID padronizado para um deck
 * Versão simplificada para frontend
 */
export const generateDeckId = (userId: string, deckName: string, collection?: string): string => {
  const userSlug = sanitizeForId(userId);
  const sanitizedDeckName = sanitizeForId(deckName);
  const sanitizedCollection = collection ? `_${sanitizeForId(collection)}` : '';
  
  // Gerar ID no formato: userSlug_collection_deckname
  return `${userSlug}${sanitizedCollection}_${sanitizedDeckName}`;
};

/**
 * Gera um ID padronizado para uma revisão
 * Versão simplificada para frontend
 */
export const generateReviewId = (userId: string, flashcardId: string): string => {
  const userSlug = sanitizeForId(userId);
  const timestamp = Date.now();
  
  // Gerar ID no formato: userSlug_flashcardId_timestamp
  return `${userSlug}_${flashcardId}_${timestamp}`;
};