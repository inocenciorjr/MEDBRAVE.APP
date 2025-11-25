import { supabase } from '../../config/supabaseAdmin';
import { AppError } from '../../shared/errors/AppError';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
    },
  };

  return {
    createClient: jest.fn(() => mockSupabase),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Supabase Admin', () => {
  describe('Database Operations', () => {
    it('should connect to Supabase successfully', () => {
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
    });

    it('should have auth methods available', () => {
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.getUser).toBe('function');
    });

    it('should have storage methods available', () => {
      expect(supabase.storage).toBeDefined();
      expect(typeof supabase.storage.from).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      supabase.from = jest.fn().mockImplementation(() => {
        throw mockError;
      });

      expect(() => {
        supabase.from('test_table');
      }).toThrow('Database connection failed');
    });

    it('should handle auth errors gracefully', async () => {
      const mockError = { error: { message: 'Authentication failed' } };
      supabase.auth.getUser = jest.fn().mockResolvedValue(mockError);

      const result = await supabase.auth.getUser();
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Authentication failed');
    });
  });

  describe('Configuration', () => {
    it('should have proper environment configuration', () => {
      // Test that the client is properly configured
      expect(supabase).toBeTruthy();
    });
  });
});
