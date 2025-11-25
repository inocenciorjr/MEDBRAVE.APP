import { SupabaseMentorshipMeetingService } from '../services';
// import { MentorshipServiceFactory } from '../factories';
import { MeetingStatus, MentorshipStatus, MeetingType } from '../types';

// Mock do Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  }),
}));

// Configuração das variáveis de ambiente para o Supabase
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

// Mock do UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-meeting-uuid'),
}));

describe('MentorshipMeetingService', () => {
  let service: SupabaseMentorshipMeetingService;
  let mockSupabase: any;
  let mockMentorshipService: any;

  // Configuração inicial para os testes
  beforeEach(() => {
    // Configuração do mock do Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    // Injetar o mock no serviço
    service = new SupabaseMentorshipMeetingService();
    (service as any).supabase = mockSupabase;

    // Mock do serviço de mentoria
    mockMentorshipService = {
      getMentorshipById: jest.fn(),
      updateMentorship: jest.fn(),
    };

    // Injetar os mocks no serviço
    // Injetar o mock do serviço de mentoria
    (service as any).mentorshipService = mockMentorshipService;
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
        scheduledDate: new Date(),
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
      await expect(
        service.completeMeeting('meeting123', new Date(), 60),
      ).rejects.toThrow(
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
        scheduledDate: new Date(),
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockMeeting,
      });

      // Act
      const result = await service.cancelMeeting(
        'meeting123',
        'Conflito de agenda',
      );

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
          scheduledDate: new Date(),
        },
        {
          id: 'meeting2',
          mentorshipId: 'mentorship123',
          status: MeetingStatus.SCHEDULED,
          scheduledDate: new Date(),
        },
      ];

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: mockMeetings.map((meeting) => ({
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
      expect(mockWhere).toHaveBeenCalledWith(
        'mentorshipId',
        '==',
        'mentorship123',
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('meeting1');
      expect(result[1].id).toBe('meeting2');
    });
  });
});
