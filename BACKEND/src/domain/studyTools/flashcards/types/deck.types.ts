export enum DeckStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  tags: string[];
  cover_image_url?: string | null;
  status: DeckStatus;
  flashcard_count: number;
  hierarchy?: any;
  hierarchy_path?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDeckDTO {
  name: string;
  description?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface UpdateDeckDTO {
  name?: string;
  description?: string;
  is_public?: boolean;
  tags?: string[];
  status?: DeckStatus;
}