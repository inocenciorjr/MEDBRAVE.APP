import { User } from '../entities/User';
import { Result } from '../../../shared/types/Result';

export interface FindUsersOptions {
  role?: string;
  searchTerm?: string;
  startAfter?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface IUserRepository {
  create(user: User, password: string): Promise<Result<User>>;
  findById(id: string): Promise<Result<User | null>>;
  findByEmail(email: string): Promise<Result<User | null>>;
  findUsers(options: FindUsersOptions): Promise<Result<{ users: User[]; total: number }>>;
  update(id: string, userData: Partial<User>): Promise<Result<User>>;
  delete(id: string): Promise<Result<void>>;
  disable(id: string): Promise<Result<void>>;
  enable(id: string): Promise<Result<void>>;
} 