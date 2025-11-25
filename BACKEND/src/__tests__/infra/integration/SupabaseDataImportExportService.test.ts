import { SupabaseDataImportExportService } from '../../../infra/integration/supabase/SupabaseDataImportExportService';
import {
  DataJobType,
  DataFormat,
  DataJobStatus,
} from '../../../infra/integration/types';
import { supabase } from '../../../config/supabaseAdmin';

// Mock do supabase
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
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
    },
  };
  return {
    supabase: mockSupabase,
  };
});

// Mock dos módulos fs, path e os
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  createReadStream: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn(),
  mkdtempSync: jest.fn(),
  rmdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((dir, file) => `${dir}/${file}`),
  basename: jest.fn((file) => file.split('/').pop()),
}));

jest.mock('os', () => ({
  tmpdir: jest.fn(() => '/tmp'),
}));

// Mock do csv-parser
jest.mock('csv-parser', () => {
  return jest.fn().mockImplementation(() => {
    const stream = require('stream');
    return new stream.Transform({
      objectMode: true,
      transform: jest.fn(),
    });
  });
});

jest.mock('csv-writer', () => ({
  createObjectCsvWriter: jest.fn().mockImplementation(() => ({
    writeRecords: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('SupabaseDataImportExportService', () => {
  let service: SupabaseDataImportExportService;
  let mockSupabaseFrom: jest.Mock;

  beforeEach(() => {
    service = new SupabaseDataImportExportService();
    mockSupabaseFrom = supabase.from as jest.Mock;
    jest.clearAllMocks();
  });

  describe('Export Operations', () => {
    it('should export data to JSON format', async () => {
      const mockData = [
        { id: '1', displayName: 'Test 1', email: 'test1@example.com' },
        { id: '2', displayName: 'Test 2', email: 'test2@example.com' },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const jobId = await service.exportData({
        tableName: 'users',
        format: DataFormat.JSON,
        filters: {},
      });

      expect(jobId).toBeDefined();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
    });

    it('should export data to CSV format', async () => {
      const mockData = [
        { id: '1', displayName: 'Test 1', email: 'test1@example.com' },
        { id: '2', displayName: 'Test 2', email: 'test2@example.com' },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const jobId = await service.exportData({
        tableName: 'users',
        format: DataFormat.CSV,
        filters: {},
      });

      expect(jobId).toBeDefined();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('users');
    });

    it('should handle export errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Export failed' },
        }),
      });

      await expect(
        service.exportData({
          tableName: 'users',
          format: DataFormat.JSON,
          filters: {},
        }),
      ).rejects.toThrow('Export failed');
    });
  });

  describe('Import Operations', () => {
    it('should import data from JSON format', async () => {
      const mockData = [
        { displayName: 'Test 1', email: 'test1@example.com' },
        { displayName: 'Test 2', email: 'test2@example.com' },
      ];

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const jobId = await service.importData({
        tableName: 'users',
        format: DataFormat.JSON,
        filePath: '/tmp/test.json',
        options: { batchSize: 100 },
      });

      expect(jobId).toBeDefined();
    });

    it('should import data from CSV format', async () => {
      const mockData = [
        { displayName: 'Test 1', email: 'test1@example.com' },
        { displayName: 'Test 2', email: 'test2@example.com' },
      ];

      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      const jobId = await service.importData({
        tableName: 'users',
        format: DataFormat.CSV,
        filePath: '/tmp/test.csv',
        options: { batchSize: 100 },
      });

      expect(jobId).toBeDefined();
    });

    it('should handle import errors gracefully', async () => {
      mockSupabaseFrom.mockReturnValue({
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Import failed' },
        }),
      });

      await expect(
        service.importData({
          tableName: 'users',
          format: DataFormat.JSON,
          filePath: '/tmp/test.json',
          options: { batchSize: 100 },
        }),
      ).rejects.toThrow('Import failed');
    });
  });

  describe('Job Management', () => {
    it('should get job status', async () => {
      const mockJob = {
        id: 'job-123',
        type: DataJobType.EXPORT,
        status: DataJobStatus.COMPLETED,
        progress: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockJob,
          error: null,
        }),
      });

      const status = await service.getJobStatus('job-123');

      expect(status).toEqual(mockJob);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('data_jobs');
    });

    it('should cancel job', async () => {
      mockSupabaseFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      await service.cancelJob('job-123');

      expect(mockSupabaseFrom).toHaveBeenCalledWith('data_jobs');
    });

    it('should list jobs with filters', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          type: DataJobType.EXPORT,
          status: DataJobStatus.COMPLETED,
          progress: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'job-2',
          type: DataJobType.IMPORT,
          status: DataJobStatus.RUNNING,
          progress: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockJobs,
          error: null,
        }),
      });

      const jobs = await service.listJobs({
        type: DataJobType.EXPORT,
        limit: 10,
      });

      expect(jobs).toEqual(mockJobs);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('data_jobs');
    });
  });
});
