import { Timestamp } from 'firebase-admin/firestore';
import { FirebaseDataImportExportService } from '../../../infra/integration/firebase/FirebaseDataImportExportService';
import {
  DataJobType,
  DataFormat,
  DataJobStatus,
} from '../../../infra/integration/types';
import { firestore } from '../../../config/firebaseAdmin';

// Mock do firestore e storage
jest.mock('../../../config/firebaseAdmin', () => {
  const mockDoc = {
    set: jest.fn(),
    get: jest.fn(),
  };
  const mockCollection = {
    doc: jest.fn(() => mockDoc),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };
  const mockFirestore = {
    collection: jest.fn(() => mockCollection),
  };
  const mockBucket = {
    file: jest.fn().mockReturnThis(),
    save: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    makePublic: jest.fn(),
    name: 'test-bucket',
  };
  const mockStorage = {
    bucket: jest.fn().mockReturnValue(mockBucket),
  };
  return {
    firestore: mockFirestore,
    storage: mockStorage,
  };
});

// Mock dos módulos fs, path e os
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
  mkdtempSync: jest.fn(),
  rmdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`),
  basename: jest.fn(file => file.split('/').pop()),
}));

jest.mock('os', () => ({
  tmpdir: jest.fn(() => '/tmp'),
}));

// Mock de csv-parser e csv-writer
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    const eventEmitter = {
      on: jest.fn().mockReturnThis(),
      pipe: jest.fn().mockReturnThis(),
    };
    return eventEmitter;
  });
});

jest.mock('csv-writer', () => ({
  createObjectCsvWriter: jest.fn().mockImplementation(() => ({
    writeRecords: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('FirebaseDataImportExportService', () => {
  let service: FirebaseDataImportExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FirebaseDataImportExportService();
  });

  describe('createDataJob', () => {
    it('should create a new data job', async () => {
      // Arrange
      const jobData = {
        type: DataJobType.EXPORT,
        name: 'Test Job',
        collection: 'users',
        format: DataFormat.JSON,
        createdBy: 'user123',
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          set: jest.fn().mockResolvedValue(undefined),
          id: 'test-job-id',
        })),
      });

      // Act
      const result = await service.createDataJob(jobData);

      // Assert
      expect(firestore.collection).toHaveBeenCalledWith('dataJobs');
      expect(result).toEqual({
        id: 'test-job-id',
        ...jobData,
        status: DataJobStatus.PENDING,
        progress: 0,
        totalRecords: null,
        processedRecords: 0,
        startedAt: null,
        completedAt: null,
        resultUrl: null,
        error: null,
        createdAt: expect.any(Timestamp),
        updatedAt: expect.any(Timestamp),
      });
    });
  });

  describe('getDataJobById', () => {
    it('should return a data job by id', async () => {
      // Arrange
      const mockJob = {
        id: 'test-job-id',
        type: DataJobType.EXPORT,
        name: 'Test Job',
        collection: 'users',
        format: DataFormat.JSON,
        status: DataJobStatus.PENDING,
        createdBy: 'user123',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const mockSnapshot = {
        exists: true,
        data: jest.fn().mockReturnValue(mockJob),
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockSnapshot),
        })),
      });

      // Act
      const result = await service.getDataJobById('test-job-id');

      // Assert
      expect(firestore.collection).toHaveBeenCalledWith('dataJobs');
      expect(result).toEqual(mockJob);
    });

    it('should return null if job not found', async () => {
      // Arrange
      const mockSnapshot = {
        exists: false,
      };

      (firestore.collection as jest.Mock).mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockSnapshot),
        })),
      });

      // Act
      const result = await service.getDataJobById('non-existent-id');

      // Assert
      expect(firestore.collection).toHaveBeenCalledWith('dataJobs');
      expect(result).toBeNull();
    });
  });

  // Outros testes para getDataJobs, updateDataJobStatus, cancelDataJob, deleteDataJob, etc.
  // Seriam adicionados aqui, mas a estrutura seguiria o mesmo padrão dos testes acima
});
