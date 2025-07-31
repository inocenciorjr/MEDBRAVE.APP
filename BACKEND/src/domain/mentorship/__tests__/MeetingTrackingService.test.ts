import { FirebaseMentorshipMeetingService } from '../services';
// import { MentorshipServiceFactory } from '../factories';
import { MeetingStatus, MentorshipStatus, MeetingType } from '../types';
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

  return {
    Timestamp: mockTimestamp,
    FieldValue: {
      increment: jest.fn().mockImplementation(num => num),
    },
  };
});

// Mock do UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-meeting-uuid'),
}));

describe('MentorshipMeetingService', () => {
  let service: FirebaseMentorshipMeetingService;
  let mockFirestore: any;
  let mockMentorshipService: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockLimit: jest.Mock;

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

    // Mock do serviço de mentoria
    mockMentorshipService = {
      getMentorshipById: jest.fn(),
      updateMentorship: jest.fn(),
    };

    // Injetar os mocks no serviço
    service = new FirebaseMentorshipMeetingService(mockFirestore, mockMentorshipService);
  });

  describe('createMeeting', () => {
    it('deve agendar uma reunião com sucesso', async () => {
      // Arrange
      const mockMentorship = {
        id: 'mentorship123',
        mentorId: 'mentor123',
        menteeId: 'student123',
        status: MentorshipStatus.ACTIVE,
      };

      mockMentorshipService.getMentorshipById.mockResolvedValue(mockMentorship);

      const meetingData = {
        mentorshipId: 'mentorship123',
        scheduledDate: new Date(),
        duration: 60,
        meetingType: MeetingType.VIDEO,
        agenda: 'Discussão do plano de estudos',
      };

      // Act
      const result = await service.createMeeting(meetingData);

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('mentorship_meetings');
      expect(mockDoc).toHaveBeenCalledWith('mocked-meeting-uuid');
      expect(mockSet).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'mocked-meeting-uuid',
        mentorshipId: 'mentorship123',
        status: MeetingStatus.SCHEDULED,
        agenda: 'Discussão do plano de estudos',
      });
    });

    it('deve lançar erro ao agendar reunião para mentoria não ativa', async () => {
      // Arrange
      const mockMentorship = {
        id: 'mentorship123',
        status: MentorshipStatus.PENDING,
      };

      mockMentorshipService.getMentorshipById.mockResolvedValue(mockMentorship);

      const meetingData = {
        mentorshipId: 'mentorship123',
        scheduledDate: new Date(),
        duration: 60,
        meetingType: MeetingType.VIDEO,
        agenda: 'Discussão do plano de estudos',
      };

      // Act & Assert
      await expect(service.createMeeting(meetingData)).rejects.toThrow(
        'Só é possível criar reuniões para mentorias ativas',
      );
    });
  });

  describe('completeMeeting', () => {
    it('deve marcar uma reunião como completada com sucesso', async () => {
      // Arrange
      const mockMeeting = {
        id: 'meeting123',
        mentorshipId: 'mentorship123',
        status: MeetingStatus.SCHEDULED,
        scheduledDate: Timestamp.now(),
        notes: 'Reunião inicial',
      };

      const mockMentorship = {
        id: 'mentorship123',
        status: MentorshipStatus.ACTIVE,
        completedMeetings: 2,
        totalMeetings: 10,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMeeting,
      });

      mockMentorshipService.getMentorshipById.mockResolvedValue(mockMentorship);
      mockMentorshipService.updateMentorship.mockResolvedValue({
        ...mockMentorship,
        completedMeetings: 3,
      });

      // Act
      const result = await service.completeMeeting(
        'meeting123',
        new Date(),
        60,
        'Reunião concluída com sucesso',
      );

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'meeting123',
        status: MeetingStatus.COMPLETED,
        notes: 'Reunião concluída com sucesso',
      });
    });

    it('deve lançar erro ao completar reunião que não está agendada', async () => {
      // Arrange
      const mockMeeting = {
        id: 'meeting123',
        mentorshipId: 'mentorship123',
        status: MeetingStatus.COMPLETED,
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMeeting,
      });

      // Act & Assert
      await expect(service.completeMeeting('meeting123', new Date(), 60)).rejects.toThrow(
        'Reuniões canceladas ou completadas não podem ser atualizadas',
      );
    });
  });

  describe('cancelMeeting', () => {
    it('deve cancelar uma reunião agendada', async () => {
      // Arrange
      const mockMeeting = {
        id: 'meeting123',
        mentorshipId: 'mentorship123',
        status: MeetingStatus.SCHEDULED,
        scheduledDate: Timestamp.now(),
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMeeting,
      });

      // Act
      const result = await service.cancelMeeting('meeting123', 'Conflito de agenda');

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'meeting123',
        status: MeetingStatus.CANCELLED,
      });
    });
  });

  describe('getMeetingsByMentorship', () => {
    it('deve retornar a lista de reuniões de uma mentoria', async () => {
      // Arrange
      const mockMeetings = [
        {
          id: 'meeting1',
          mentorshipId: 'mentorship123',
          status: MeetingStatus.COMPLETED,
          scheduledDate: Timestamp.now(),
        },
        {
          id: 'meeting2',
          mentorshipId: 'mentorship123',
          status: MeetingStatus.SCHEDULED,
          scheduledDate: Timestamp.now(),
        },
      ];

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: mockMeetings.map(meeting => ({
            id: meeting.id,
            data: () => meeting,
          })),
          empty: false,
          size: mockMeetings.length,
        }),
      });

      // Act
      const result = await service.getMeetingsByMentorship('mentorship123');

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('mentorship_meetings');
      expect(mockWhere).toHaveBeenCalledWith('mentorshipId', '==', 'mentorship123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('meeting1');
      expect(result[1].id).toBe('meeting2');
    });
  });
});
