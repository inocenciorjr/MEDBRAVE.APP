/**
 * Interface para Coleção de Flashcards
 * Representa uma coleção com ID único
 */
export interface Collection {
  id: string; // ID único da coleção (gerado por generateCollectionId)
  name: string; // Nome da coleção
  title?: string; // Título alternativo
  description?: string; // Descrição da coleção
  owner_id: string; // ID do usuário dono da coleção
  user_id: string; // ID do usuário (mesmo que owner_id)
  is_public: boolean; // Se está pública na comunidade
  is_official?: boolean; // Se é uma coleção oficial MedBrave
  category?: string; // Categoria da coleção
  tags?: string[]; // Tags da coleção
  deck_count: number; // Quantidade de decks
  card_count: number; // Quantidade total de cards
  difficulty?: string; // Nível de dificuldade
  language?: string; // Idioma
  image_url?: string; // URL da imagem
  thumbnail_url?: string; // URL da thumbnail
  view_count?: number; // Visualizações
  download_count?: number; // Downloads
  rating?: number; // Avaliação média
  rating_count?: number; // Quantidade de avaliações
  created_at: any; // Data de criação (JSONB)
  updated_at: any; // Data de atualização (JSONB)
}

/**
 * Interface para criação de coleção
 */
export interface CreateCollectionDTO {
  name: string;
  description?: string;
  user_id: string;
  is_public?: boolean;
  thumbnail_url?: string;
}

/**
 * Interface para atualização de coleção
 */
export interface UpdateCollectionDTO {
  name?: string;
  description?: string;
  is_public?: boolean;
  thumbnail_url?: string;
}

/**
 * Interface para metadados de coleção (listagem)
 */
export interface CollectionMetadata {
  id: string;
  name: string;
  deck_count: number;
  card_count: number;
  thumbnail_url?: string;
  is_public: boolean;
  created_at: any;
  updated_at: any;
}
