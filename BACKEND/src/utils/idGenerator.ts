import { firestore } from '../config/firebaseAdmin';

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
 * Gera um ID padronizado para um flashcard
 */
export const generateFlashcardId = async (userId: string, deckId: string, index: number): Promise<string> => {
  // Buscar o username do usuário
  const userDoc = await firestore.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const usernameSlug = userData?.usernameSlug || sanitizeForId(userData?.displayName || 'user');

  // Buscar o deck para pegar a coleção e o nome do deck
  const deckDoc = await firestore.collection('decks').doc(deckId).get();
  const deckData = deckDoc.data();
  const collection = sanitizeForId(deckData?.collection || 'default');
  const deckName = sanitizeForId(deckData?.name || 'deck');

  // Gerar ID no formato: username_collection_deck_index
  return `${usernameSlug}_${collection}_${deckName}_${index}`;
};

/**
 * Gera um ID padronizado para um deck
 */
export const generateDeckId = async (userId: string, deckName: string, collection?: string): Promise<string> => {
  // Buscar o username do usuário
  const userDoc = await firestore.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const usernameSlug = userData?.usernameSlug || sanitizeForId(userData?.displayName || 'user');

  // Sanitizar nome do deck e coleção
  const sanitizedDeckName = sanitizeForId(deckName);
  const sanitizedCollection = collection ? `_${sanitizeForId(collection)}` : '';

  // Gerar ID no formato: username_collection_deckname
  return `${usernameSlug}${sanitizedCollection}_${sanitizedDeckName}`;
};

/**
 * Gera um ID padronizado para uma revisão
 */
export const generateReviewId = async (userId: string, flashcardId: string): Promise<string> => {
  // Buscar o username do usuário
  const userDoc = await firestore.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const usernameSlug = userData?.usernameSlug || sanitizeForId(userData?.displayName || 'user');

  // Usar timestamp para garantir unicidade
  const timestamp = Date.now();

  // Gerar ID no formato: username_flashcardId_timestamp
  return `${usernameSlug}_${flashcardId}_${timestamp}`;
};

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
 */
export const generateQuestionResponseId = async (userId: string, questionId: string): Promise<string> => {
  // Buscar o username do usuário
  const userDoc = await firestore.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const usernameSlug = userData?.usernameSlug || sanitizeForId(userData?.displayName || 'user');

  // Usar timestamp para garantir unicidade
  const timestamp = Date.now();

  // Gerar ID no formato: username_questionId_timestamp
  return `${usernameSlug}_${questionId}_${timestamp}`;
};

/**
 * Gera um ID padronizado para retenção de questão
 */
export const generateQuestionRetentionId = (userId: string, questionId: string): string => {
  // Formato simples: userId_questionId (como já estava sendo usado)
  return `${userId}_${questionId}`;
};