import { SupabaseBaseRepository } from '../../../infra/database/SupabaseBaseRepository';
import { supabase } from '../../../config/supabaseAdmin';

// Interface de teste para uma entidade
interface TestEntity {
  id: string;
  displayName: string;
  email: string;
  age: number;
  role: string;
  created_at?: string;
  updated_at?: string;
}

// Usa o prefixo de teste global para evitar conflitos entre execuções
const testTableName = "test_entity_repository";

// Implementação de teste do repositório
class TestRepository extends SupabaseBaseRepository<TestEntity> {
  constructor() {
    super(testTableName);
  }
}

// Mock do Supabase
jest.mock('../../../config/supabaseAdmin', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  };

  return {
    supabase: mockSupabase,
  };
});

describe('SupabaseBaseRepository', () => {
  let repository: TestRepository;
  let mockSupabaseFrom: jest.Mock;

  beforeEach(() => {
    repository = new TestRepository();
    mockSupabaseFrom = supabase.from as jest.Mock;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new entity with ID and timestamps', async () => {
      const entityData: Omit<TestEntity, 'id' | 'created_at' | 'updated_at'> = {
        displayName: 'Test User',
        email: 'test@example.com',
        age: 30,
        role: 'user',
      };

      const mockCreatedEntity = {
        id: 'test-id-123',
        ...entityData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCreatedEntity,
          error: null,
        }),
      });

      const result = await repository.create(entityData);

      expect(mockSupabaseFrom).toHaveBeenCalledWith(testTableName);
      expect(result).toEqual(mockCreatedEntity);
    });

    it('should throw error when creation fails', async () => {
      const entityData: Omit<TestEntity, 'id' | 'created_at' | 'updated_at'> = {
        displayName: 'Test User',
        email: 'test@example.com',
        age: 30,
        role: 'user',
      };

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        }),
      });

      await expect(repository.create(entityData)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findById', () => {
    it('should find entity by ID', async () => {
      const mockEntity = {
        id: 'test-id-123',
        displayName: 'Test User',
        email: 'test@example.com',
        age: 30,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEntity,
          error: null,
        }),
      });

      const result = await repository.findById('test-id-123');

      expect(mockSupabaseFrom).toHaveBeenCalledWith(testTableName);
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity not found', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error code
        }),
      });

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      const updateData = { displayName: 'Updated Name', age: 31 };
      const mockUpdatedEntity = {
        id: 'test-id-123',
        displayName: 'Updated Name',
        email: 'test@example.com',
        age: 31,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUpdatedEntity,
          error: null,
        }),
      });

      const result = await repository.update('test-id-123', updateData);

      expect(mockSupabaseFrom).toHaveBeenCalledWith(testTableName);
      expect(result).toEqual(mockUpdatedEntity);
    });
  });

  describe('delete', () => {
    it('should delete entity successfully', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await repository.delete('test-id-123');

      expect(mockSupabaseFrom).toHaveBeenCalledWith(testTableName);
    });

    it('should throw error when deletion fails', async () => {
      mockSupabaseFrom.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Deletion failed' },
        }),
      });

      await expect(repository.delete('test-id-123')).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const mockEntities = [
        {
          id: 'test-id-1',
          displayName: 'User 1',
          email: 'user1@example.com',
          age: 25,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'test-id-2',
          displayName: 'User 2',
          email: 'user2@example.com',
          age: 30,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockEntities,
          error: null,
        }),
      });

      const result = await repository.findAll();

      expect(mockSupabaseFrom).toHaveBeenCalledWith(testTableName);
      expect(result).toEqual(mockEntities);
    });
  });
});
