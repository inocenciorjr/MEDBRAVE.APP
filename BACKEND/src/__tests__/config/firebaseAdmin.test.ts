import firebaseAdmin, {
  firestore,
  auth,
  storage,
  deleteCollection,
  AppError,
} from '../../config/firebaseAdmin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  const mockApp = {
    firestore: jest.fn(),
    auth: jest.fn(),
    storage: jest.fn(),
  };

  const adminMock = {
    initializeApp: jest.fn(() => mockApp),
    app: jest.fn(() => mockApp),
    credential: {
      cert: jest.fn(() => ({})),
    },
    firestore: {
      Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date() })),
      },
    },
  };

  return adminMock;
});

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  cert: jest.fn(() => ({})),
}));

jest.mock('firebase-admin/firestore', () => {
  const mockCollection = {
    doc: jest.fn(),
    orderBy: jest.fn(function () {
      return this;
    }),
    limit: jest.fn(function () {
      return this;
    }),
    get: jest.fn(() => Promise.resolve({ size: 0, docs: [] })),
  };

  const mockDb = {
    settings: jest.fn(),
    collection: jest.fn(() => mockCollection),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve({})),
    })),
  };

  return {
    getFirestore: jest.fn(() => mockDb),
  };
});

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({})),
}));

jest.mock('firebase-admin/storage', () => ({
  getStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({})),
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

// Clean up mocks
beforeEach(() => {
  jest.clearAllMocks();
});

describe('Firebase Admin', () => {
  describe('Singleton Instance', () => {
    it('should provide the same instance every time', () => {
      const instance1 = firebaseAdmin;
      const instance2 = firebaseAdmin;

      expect(instance1).toBe(instance2);
    });
  });

  describe('Services Exports', () => {
    it('should export Firestore, Auth and Storage services', () => {
      expect(firestore).toBeDefined();
      expect(auth).toBeDefined();
      expect(storage).toBeDefined();
    });
  });

  describe('AppError', () => {
    it('should create an AppError with status code and message', () => {
      const error = new AppError('Not Found', 404);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not Found');
    });

    it('should capture stack trace', () => {
      const error = new AppError('Server Error', 500);

      expect(error.stack).toBeDefined();
      expect(error.stack?.includes('AppError')).toBe(true);
    });
  });

  describe('deleteCollection', () => {
    it('should delete a collection', async () => {
      // Mock para uma coleção vazia
      const mockGet = jest.fn(() => Promise.resolve({ size: 0, docs: [] }));
      const mockOrderBy = jest.fn(function () {
        return this;
      });
      const mockLimit = jest.fn(function () {
        return this;
      });
      const mockCollection = jest.fn(() => ({
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      }));

      // @ts-ignore - Acesso a propriedade protegida para testes
      firebaseAdmin.db.collection = mockCollection;

      await deleteCollection('test_collection');

      expect(mockCollection).toHaveBeenCalledWith('test_collection');
      expect(mockOrderBy).toHaveBeenCalledWith('__name__');
      expect(mockLimit).toHaveBeenCalledWith(500);
      expect(mockGet).toHaveBeenCalled();
    });

    it('should handle batch delete for multiple documents', async () => {
      const mockDocs = [{ ref: { id: 'doc1' } }, { ref: { id: 'doc2' } }];

      const mockGet = jest.fn(() =>
        Promise.resolve({
          size: 2,
          docs: mockDocs,
        }),
      );

      const mockBatchDelete = jest.fn();
      const mockBatchCommit = jest.fn(() => Promise.resolve({}));
      const mockBatch = jest.fn(() => ({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      }));

      const mockOrderBy = jest.fn(function () {
        return this;
      });
      const mockLimit = jest.fn(function () {
        return this;
      });
      const mockCollection = jest.fn(() => ({
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      }));

      // @ts-ignore - Acesso a propriedade protegida para testes
      firebaseAdmin.db.collection = mockCollection;
      // @ts-ignore - Acesso a propriedade protegida para testes
      firebaseAdmin.db.batch = mockBatch;

      await deleteCollection('test_collection');

      expect(mockBatch).toHaveBeenCalled();
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it('should handle errors during collection deletion', async () => {
      const mockGet = jest.fn(() => Promise.reject(new Error('Database error')));
      const mockOrderBy = jest.fn(function () {
        return this;
      });
      const mockLimit = jest.fn(function () {
        return this;
      });
      const mockCollection = jest.fn(() => ({
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
      }));

      // @ts-ignore - Acesso a propriedade protegida para testes
      firebaseAdmin.db.collection = mockCollection;

      await expect(deleteCollection('test_collection')).rejects.toThrow('Database error');
    });
  });
});
