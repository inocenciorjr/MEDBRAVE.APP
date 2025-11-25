import { supabaseAdmin } from '../supabase.config';

interface DeckData {
  collectionName?: string;
  nomeItem?: string;
}

/**
 * Função para sanitizar texto para uso em IDs
 */
export const sanitizeForId = (text: string): string => {
  // Mapa de substituição de caracteres acentuados
  const accentMap: { [key: string]: string } = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N'
  };
  
  return (text || 'user')
    .split('')
    .map(char => accentMap[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
};

/**
 * Gera um ID padronizado para um flashcard
 */
export const generateFlashcardId = async (
  user_id: string,
  deck_id: string,
  index: number,
  deckData?: DeckData,
): Promise<string> => {
  if (!user_id) {
    console.error('[FLASHCARD] Erro: user_id é undefined em generateFlashcardId');
    throw new Error('user_id é obrigatório para gerar ID do flashcard');
  }

  // Buscar o username do usuário
  const { data: userData, error: userError } = await (supabaseAdmin as any)
    .from('users')
    .select('username_slug, display_name')
    .eq('id', user_id)
    .maybeSingle();

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
  }

  const usernameSlug =
    userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

  // Se deckData foi fornecido, usar diretamente
  if (deckData) {
    const collection = sanitizeForId(deckData.collectionName || 'default');
    const deckName = sanitizeForId(deckData.nomeItem || 'deck');
    return `${usernameSlug}_${collection}_${deckName}_${index}`;
  }

  // Buscar o deck para pegar a coleção e o nome do deck
  const { data: fetchedDeckData, error: deckError } = await (supabaseAdmin as any)
    .from('decks')
    .select('collection, name')
    .eq('id', deck_id)
    .maybeSingle();

  if (deckError || !fetchedDeckData) {
    if (deckError && deckError.code !== 'PGRST116') {
      console.error('Erro ao buscar deck:', deckError);
    }
    return `${usernameSlug}_default_deck_${index}`;
  }

  const collection = sanitizeForId((fetchedDeckData as any).collection || 'default');
  const deckName = sanitizeForId((fetchedDeckData as any).name || 'deck');

  // Gerar ID no formato: username_collection_deck_index
  return `${usernameSlug}_${collection}_${deckName}_${index}`;
};

/**
 * Gera um ID padronizado para um deck
 * Para decks com mesmo nome, usa hash da hierarquia para garantir consistência
 */
export const generateDeckId = async (
  user_id: string,
  deckName: string,
  collection?: string,
  hierarchyPath?: string,
): Promise<string> => {
  if (!user_id) {
    console.error('[DECK] Erro: user_id é undefined em generateDeckId');
    throw new Error('user_id é obrigatório para gerar ID do deck');
  }

  // Buscar o username do usuário
  const { data: userData, error: userError } = await (supabaseAdmin as any)
    .from('users')
    .select('username_slug, display_name')
    .eq('id', user_id)
    .maybeSingle();

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
  }

  const usernameSlug =
    userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

  // Sanitizar nome do deck e coleção
  const sanitizedDeckName = sanitizeForId(deckName);
  const sanitizedCollection = collection ? `_${sanitizeForId(collection)}` : '';

  // Gerar ID base no formato: username_collection_deckname
  let baseId = `${usernameSlug}${sanitizedCollection}_${sanitizedDeckName}`;

  // Se há hierarchyPath (caminho completo do deck), usar hash para diferenciar
  if (hierarchyPath && hierarchyPath.includes('::')) {
    const crypto = require('crypto');
    const pathHash = crypto
      .createHash('md5')
      .update(hierarchyPath)
      .digest('hex')
      .substring(0, 6);

    baseId = `${baseId}-${pathHash}`;
  }

  return baseId;
};

/**
 * Gera um ID padronizado para uma coleção com hash único para evitar colisões
 */
export const generateCollectionId = async (
  user_id: string,
  collectionName: string,
): Promise<string> => {
  if (!user_id) {
    console.error('[COLLECTION] Erro: user_id é undefined em generateCollectionId');
    throw new Error('user_id é obrigatório para gerar ID da coleção');
  }

  // Buscar o username do usuário
  const { data: userData, error: userError } = await (supabaseAdmin as any)
    .from('users')
    .select('username_slug, display_name')
    .eq('id', user_id)
    .maybeSingle();

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
  }

  const usernameSlug =
    userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

  // Sanitizar nome da coleção
  const sanitizedCollectionName = sanitizeForId(collectionName);

  // Gerar hash único baseado no userId + collectionName + timestamp para evitar colisões
  const crypto = require('crypto');
  const hash = crypto
    .createHash('sha256')
    .update(`${user_id}-${collectionName}-${Date.now()}`)
    .digest('hex')
    .substring(0, 8);

  // Gerar ID no formato: username_collection_hash
  return `${usernameSlug}_${sanitizedCollectionName}_${hash}`;
};

/**
 * Gera um ID padronizado para uma revisão
 */
export const generateReviewId = async (
  user_id: string,
  flashcardId: string,
): Promise<string> => {
  if (!user_id) {
    console.error('[REVIEW] Erro: user_id é undefined em generateReviewId');
    throw new Error('user_id é obrigatório para gerar ID da revisão');
  }

  // Buscar o username do usuário
  const { data: userData, error: userError } = await (supabaseAdmin as any)
    .from('users')
    .select('username_slug, display_name')
    .eq('id', user_id)
    .maybeSingle();

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
  }

  const usernameSlug =
    userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

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
 * Gera um ID padronizado para uma prova oficial baseado no título
 * Formato: primeiras30letras-SUFIXO6
 * Exemplo: "ufpe-pe-r1-2024-XYZ47D"
 */
export const generateOfficialExamId = (title: string): string => {
  if (!title || typeof title !== 'string') {
    throw new Error('Título da prova oficial é obrigatório para gerar ID');
  }

  // Sanitizar as primeiras 30 letras do título
  const sanitizedTitle = sanitizeForId(title).substring(0, 30);

  // Gerar sufixo aleatório
  const randomSuffix = generateRandomSuffix();

  // Retornar no formato: titulo-sufixo
  return `${sanitizedTitle}-${randomSuffix}`;
};

/**
 * Gera um ID padronizado para resposta de questão
 */
export const generateQuestionResponseId = async (
  user_id: string,
  questionId: string,
): Promise<string> => {
  if (!user_id) {
    console.error('[QUESTION] Erro: user_id é undefined em generateQuestionResponseId');
    throw new Error('user_id é obrigatório para gerar ID da resposta');
  }

  // Buscar o username do usuário
  const { data: userData, error: userError } = await (supabaseAdmin as any)
    .from('users')
    .select('username_slug, display_name')
    .eq('id', user_id)
    .maybeSingle();

  if (userError) {
    console.error('Erro ao buscar usuário:', userError);
  }

  const usernameSlug =
    userData?.username_slug || sanitizeForId(userData?.display_name || 'user');

  // Usar timestamp para garantir unicidade
  const timestamp = Date.now();

  // Gerar ID no formato: username_questionId_timestamp
  return `${usernameSlug}_${questionId}_${timestamp}`;
};

/**
 * Gera um ID determinístico para retenção de questão
 */
export const generateQuestionRetentionId = (
  user_id: string,
  questionId: string,
): string => {
  if (!user_id || !questionId) {
    throw new Error('Parâmetros obrigatórios ausentes para gerar ID de retenção');
  }
  return `${sanitizeForId(user_id)}_${sanitizeForId(questionId)}`;
};
