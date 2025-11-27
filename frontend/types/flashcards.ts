// Types for Flashcards System

export interface Collection {
  id: string; // UUID único da coleção
  name: string;
  title?: string; // Título alternativo
  description?: string;
  deckCount: number;
  cardCount?: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  thumbnail_url?: string | null;
  image_url?: string | null; // Alias para thumbnail_url
  isImported?: boolean; // Importada via arquivo .apkg
  isPublic?: boolean;
  is_public?: boolean; // Alias para isPublic
  isFromCommunity?: boolean; // Importada da biblioteca pública (referenciada)
  canEdit?: boolean; // Se o usuário logado pode editar (validado pelo backend)
  user_id?: string; // ID do dono da coleção
  owner_id?: string; // Alias para user_id
  is_official?: boolean; // Se é uma coleção oficial do MedBrave
  // Campos para coleções da comunidade
  author_name?: string;
  author_id?: string;
  author_avatar?: string;
  likes?: number;
  imports?: number;
  is_hot?: boolean;
}

export interface Deck {
  id: string;
  collectionId?: string; // UUID da coleção
  collection_id?: string; // Alias para collectionId
  name: string;
  description?: string;
  institution?: string;
  area?: string;
  tags: string[];
  totalCards: number;
  card_count?: number; // Alias para totalCards
  flashcard_count?: number; // Alias para totalCards
  studiedCards?: number;
  reviewCards?: number;
  newCards?: number;
  isAdded?: boolean;
  priority?: number;
  createdAt: string; // ISO date string
  created_at?: string; // Alias para createdAt
  updatedAt: string; // ISO date string
  updated_at?: string; // Alias para updatedAt
  user_id?: string; // ID do dono do deck
  is_public?: boolean; // Se o deck é público
  is_imported?: boolean; // Se foi importado da comunidade
  image_url?: string | null; // Thumbnail do deck
  hierarchy?: string[]; // Hierarquia do deck
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string; // Pergunta
  back: string; // Resposta
  isHtml?: boolean;
  images?: string[];
  audio?: string[];
  breadcrumb: string[];
  nextReview?: string; // ISO date string
  interval: number; // dias até próxima revisão
  easeFactor: number; // fator de facilidade (SM-2 algorithm)
  repetitions: number;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface StudySession {
  deckId: string;
  cards: Flashcard[];
  currentIndex: number;
  completedCards: number;
  startedAt: string; // ISO date string
}

export type CardSide = 'front' | 'back';
export type Difficulty = 'again' | 'hard' | 'good' | 'easy';

export interface CardReview {
  cardId: string;
  difficulty: Difficulty;
  reviewedAt: string; // ISO date string
}

// Extended types for tabs pages
export interface CollectionWithStats extends Collection {
  institution?: string;
  tags: CollectionTag[];
  newCards: number;
  isAdded: boolean;
  isImported?: boolean; // Se foi importada via .apkg
  thumbnail_url?: string | null; // URL da thumbnail no R2
}

export interface CollectionTag {
  id: string;
  label: string;
  icon: string;
  color: 'purple' | 'teal' | 'blue' | 'yellow' | 'pink' | 'red';
}

export interface Institution {
  id: string;
  name: string;
  logo: string;
  deckCount: number;
  likes: number;
  icon?: string;
  imports?: number;
  user_id?: string; // ID do dono da coleção
  isOfficial?: boolean;
  thumbnail_url?: string | null;
  image_url?: string | null;
}

export interface Specialty {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  deckCount: number;
  likes: number;
  imports: number;
  isHot: boolean;
  author?: string;
  thumbnail_url?: string | null;
  image_url?: string | null;
  user_id?: string; // ID do dono da coleção
  isOfficial?: boolean;
}

export type TabType = 'minhas-colecoes' | 'comunidade';

export type CommunitySortOption = 'recent' | 'likes' | 'imports';
