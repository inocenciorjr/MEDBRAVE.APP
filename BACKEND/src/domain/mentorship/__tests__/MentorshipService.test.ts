import { FirebaseMentorshipService } from '../services';
import {
  Mentorship,
  CreateMentorshipPayload,
  MentorshipStatus,
  MeetingFrequency,
} from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock do Firebase
jest.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    now: jest.fn().mockReturnValue({
      toMillis: () => Date.now(),
      toDate: () => new Date(),
    }),
    fromMillis: jest.fn().mockImplementation(ms => ({
      toMillis: () => ms,
      toDate: () => new Date(ms),
    })),
  };

  const mockFieldValue = {
    increment: jest.fn().mockImplementation(num => num),
  };

  return {
    Timestamp: mockTimestamp,
    FieldValue: mockFieldValue,
  };
});

// Mock do UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('MentorshipService', () => {
  let service: FirebaseMentorshipService;
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;
  let mockOffset: jest.Mock;
  let mockCount: jest.Mock;

  // Configuração inicial para os testes
  beforeEach(() => {
    // Reset dos mocks
    mockGet = jest.fn();
    mockSet = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockWhere = jest.fn();
    mockOrderBy = jest.fn();
    mockLimit = jest.fn();
    mockOffset = jest.fn();
    mockCount = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: () => ({ count: 10 }),
      }),
    });

    // Configuração do mock do documento
    mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
      delete: mockDelete,
    });

    // Configuração do mock da collection
    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      count: mockCount,
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      }),
    });

    // Configuração do where e orderBy para criar consultas encadeadas
    mockWhere.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      }),
    });

    mockOrderBy.mockReturnValue({
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      offset: mockOffset,
      startAfter: jest.fn(),
      get: jest.fn().mockResolvedValue({
        docs: [],
        empty: true,
        size: 0,
      }),
    });

    // Configuração do mock do Firestore
    mockFirestore = {
      collection: mockCollection,
    };

    // Injetar o mock no serviço
    service = new FirebaseMentorshipService(mockFirestore);
  });

  describe('createMentorship', () => {
    it('deve criar uma mentoria com sucesso', async () => {
      // Arrange
      mockGet.mockImplementation(path => {
        // Retorna dados dependendo do caminho ou ID
        if (path.includes('users/mentor123')) {
          return Promise.resolve({ exists: true });
        } else if (path.includes('users/student123')) {
          return Promise.resolve({ exists: true });
        }
        return Promise.resolve({ exists: false });
      });

      mockCollection.mockImplementation(name => {
        if (name === 'users') {
          return {
            doc: () => ({
              get: () => Promise.resolve({ exists: true }),
            }),
          };
        }
        return {
          doc: mockDoc,
          where: mockWhere,
        };
      });

      mockWhere.mockReturnValue({
        where: mockWhere,
        get: jest.fn().mockResolvedValue({ empty: true }),
      });

      const mentorshipData: CreateMentorshipPayload = {
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
        description: 'Mentoria para residência em cardiologia',
        meetingFrequency: MeetingFrequency.WEEKLY,
        totalMeetings: 12,
      };

      // Act
      const result = await service.createMentorship(mentorshipData);

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('mentorships');
      expect(mockDoc).toHaveBeenCalledWith('mocked-uuid');
      expect(mockSet).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'mocked-uuid',
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
        description: 'Mentoria para residência em cardiologia',
        status: MentorshipStatus.PENDING,
        meetingFrequency: MeetingFrequency.WEEKLY,
        totalMeetings: 12,
        completedMeetings: 0,
      });
    });

    it('deve lançar erro quando mentor e mentorado são a mesma pessoa', async () => {
      // Arrange
      const mentorshipData: CreateMentorshipPayload = {
        mentorId: 'user123',
        menteeId: 'user123',
        title: 'Mentoria inválida',
      };

      // Act & Assert
      await expect(service.createMentorship(mentorshipData)).rejects.toThrow(
        'Mentor e mentorado não podem ser o mesmo usuário',
      );
    });

    it('deve lançar erro quando o mentor não existe', async () => {
      // Arrange
      mockGet.mockImplementation(path => {
        if (path.includes('mentor123')) {
          return Promise.resolve({ exists: false });
        }
        return Promise.resolve({ exists: true });
      });

      const mentorshipData: CreateMentorshipPayload = {
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
      };

      // Act & Assert
      await expect(service.createMentorship(mentorshipData)).rejects.toThrow(
        'Mentor com ID mentor123 não encontrado',
      );
    });
  });

  describe('getMentorshipById', () => {
    it('deve retornar a mentoria quando existir', async () => {
      // Arrange
      const mockMentorship: Mentorship = {
        id: 'mentorship123',
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
        description: 'Mentoria para residência em cardiologia',
        status: MentorshipStatus.ACTIVE,
        startDate: Timestamp.now(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        customFrequencyDays: undefined,
        nextMeetingDate: null,
        lastMeetingDate: null,
        meetingCount: 0,
        totalMeetings: 12,
        completedMeetings: 2,
        objectives: ['Objetivo 1', 'Objetivo 2'],
        notes: 'Notas da mentoria',
        rating: null,
        feedback: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMentorship,
      });

      // Act
      const result = await service.getMentorshipById('mentorship123');

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('mentorships');
      expect(mockDoc).toHaveBeenCalledWith('mentorship123');
      expect(result).toEqual(mockMentorship);
    });

    it('deve retornar null quando a mentoria não existir', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: false });

      // Act
      const result = await service.getMentorshipById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('acceptMentorship', () => {
    it('deve aceitar uma mentoria pendente com sucesso', async () => {
      // Arrange
      const mockMentorship: Mentorship = {
        id: 'mentorship123',
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
        status: MentorshipStatus.PENDING,
        startDate: Timestamp.now(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 12,
        completedMeetings: 0,
        objectives: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        rating: null,
        feedback: null,
      };

      mockGet.mockImplementation(() => {
        return Promise.resolve({
          exists: true,
          data: () => mockMentorship,
        });
      });

      // Act
      await service.acceptMentorship('mentorship123');

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        status: MentorshipStatus.ACTIVE,
        startDate: expect.anything(),
        nextMeetingDate: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    it('deve lançar erro ao aceitar uma mentoria que não está pendente', async () => {
      // Arrange
      const mockMentorship: Mentorship = {
        id: 'mentorship123',
        status: MentorshipStatus.ACTIVE,
        // ... outros campos obrigatórios
        mentorId: '',
        menteeId: '',
        title: '',
        startDate: Timestamp.now(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 0,
        completedMeetings: 0,
        objectives: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        rating: null,
        feedback: null,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMentorship,
      });

      // Act & Assert
      await expect(service.acceptMentorship('mentorship123')).rejects.toThrow(
        'Apenas mentorias pendentes podem ser aceitas',
      );
    });
  });

  describe('completeMentorship', () => {
    it('deve completar uma mentoria ativa com sucesso', async () => {
      // Arrange
      const mockMentorship: Mentorship = {
        id: 'mentorship123',
        mentorId: 'mentor123',
        menteeId: 'student123',
        title: 'Mentoria de Cardiologia',
        status: MentorshipStatus.ACTIVE,
        startDate: Timestamp.now(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 5,
        totalMeetings: 12,
        completedMeetings: 5,
        objectives: ['Objetivo 1', 'Objetivo 2'],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        rating: null,
        feedback: null,
      };

      mockGet.mockImplementation(() => {
        return Promise.resolve({
          exists: true,
          data: () => mockMentorship,
        });
      });

      // Act
      await service.completeMentorship('mentorship123', 4.5, 'Excelente mentoria');

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        status: MentorshipStatus.COMPLETED,
        endDate: expect.anything(),
        rating: 4.5,
        feedback: 'Excelente mentoria',
        updatedAt: expect.anything(),
      });
    });

    it('deve lançar erro ao completar uma mentoria que não está ativa', async () => {
      // Arrange
      const mockMentorship: Mentorship = {
        id: 'mentorship123',
        status: MentorshipStatus.CANCELLED,
        // ... outros campos obrigatórios
        mentorId: '',
        menteeId: '',
        title: '',
        startDate: Timestamp.now(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 0,
        completedMeetings: 0,
        objectives: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        rating: null,
        feedback: null,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMentorship,
      });

      // Act & Assert
      await expect(service.completeMentorship('mentorship123')).rejects.toThrow(
        'Apenas mentorias ativas podem ser completadas',
      );
    });
  });
});
