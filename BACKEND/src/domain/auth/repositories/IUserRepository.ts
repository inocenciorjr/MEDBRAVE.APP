export interface IUserRepository {
  findById(userId: string): Promise<User | null>;
  create(user: CreateUserDTO): Promise<User>;
  update(userId: string, data: Partial<User>): Promise<User>;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: string;
  username_slug: string;
  created_at: string;
  updated_at: string;
  mastered_flashcards: number;
  total_decks: number;
  total_flashcards: number;
  active_flashcards: number;
}

export interface CreateUserDTO {
  id: string;
  email: string;
  display_name: string;
  photo_url?: string;
  role: string;
  username_slug: string;
  mastered_flashcards?: number;
  total_decks?: number;
  total_flashcards?: number;
  active_flashcards?: number;
}
