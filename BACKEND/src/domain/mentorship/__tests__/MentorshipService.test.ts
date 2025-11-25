import { SupabaseMentorshipService } from '../services';
import {
  Mentorship,
  CreateMentorshipPayload,
  MentorshipStatus,
  MeetingFrequency,
} from '../types';

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
  }),
}));

// Mock do UUID
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

// Mock das variáveis de ambiente
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

describe('MentorshipService', () => {
  let service: SupabaseMentorshipService;
  let mockSupabase: any;

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
    };

    // Injetar o mock no serviço
    service = new SupabaseMentorshipService();
    (service as any).supabase = mockSupabase;
  });

  describe('createMentorship', () => {
    it('deve criar uma mentoria com sucesso', async () => {
      // Arrange
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // Verificação de mentoria existente
      mockSupabase.insert.mockResolvedValueOnce({
        data: [
          {
            id: 'mocked-uuid',
            mentor_id: 'mentor123',
            mentee_id: 'student123',
            title: 'Mentoria de Cardiologia',
            description: 'Mentoria para residência em cardiologia',
            status: MentorshipStatus.PENDING,
            meeting_frequency: MeetingFrequency.WEEKLY,
            total_meetings: 12,
            completed_meetings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
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
      expect(mockSupabase.from).toHaveBeenCalledWith('mentorships');
      expect(mockSupabase.insert).toHaveBeenCalled();
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
      mockSupabase.select.mockResolvedValueOnce({ data: [], error: null }); // Verificação de mentoria existente
      mockSupabase.insert.mockRejectedValueOnce(
        new Error('Mentor com ID mentor123 não encontrado'),
      );

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
        startDate: new Date(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mentorship123',
          mentor_id: 'mentor123',
          mentee_id: 'student123',
          title: 'Mentoria de Cardiologia',
          description: 'Mentoria para residência em cardiologia',
          status: MentorshipStatus.ACTIVE,
          start_date: new Date().toISOString(),
          end_date: null,
          meeting_frequency: MeetingFrequency.WEEKLY,
          custom_frequency_days: undefined,
          next_meeting_date: null,
          last_meeting_date: null,
          meeting_count: 0,
          total_meetings: 12,
          completed_meetings: 2,
          objectives: ['Objetivo 1', 'Objetivo 2'],
          notes: 'Notas da mentoria',
          rating: null,
          feedback: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Act
      const result = await service.getMentorshipById('mentorship123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('mentorships');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'mentorship123');
      expect(result).toEqual(mockMentorship);
    });

    it('deve retornar null quando a mentoria não existir', async () => {
      // Arrange
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

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
        startDate: new Date(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 12,
        completedMeetings: 0,
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: null,
        feedback: null,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'mentorship123',
          mentor_id: 'mentor123',
          mentee_id: 'student123',
          title: 'Mentoria de Cardiologia',
          status: MentorshipStatus.PENDING,
          start_date: new Date().toISOString(),
          end_date: null,
          meeting_frequency: MeetingFrequency.WEEKLY,
          meeting_count: 0,
          total_meetings: 12,
          completed_meetings: 0,
          objectives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rating: null,
          feedback: null,
        },
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [
          {
            id: 'mentorship123',
            status: MentorshipStatus.ACTIVE,
            start_date: new Date().toISOString(),
            next_meeting_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      // Act
      await service.acceptMentorship('mentorship123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('mentorships');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'mentorship123');
      expect(mockSupabase.update).toHaveBeenCalled();
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
        startDate: new Date(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 0,
        completedMeetings: 0,
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: null,
        feedback: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mentorship123',
          status: MentorshipStatus.ACTIVE,
          mentor_id: '',
          mentee_id: '',
          title: '',
          start_date: new Date().toISOString(),
          end_date: null,
          meeting_frequency: MeetingFrequency.WEEKLY,
          meeting_count: 0,
          total_meetings: 0,
          completed_meetings: 0,
          objectives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rating: null,
          feedback: null,
        },
        error: null,
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
        startDate: new Date(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 5,
        totalMeetings: 12,
        completedMeetings: 5,
        objectives: ['Objetivo 1', 'Objetivo 2'],
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: null,
        feedback: null,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'mentorship123',
          mentor_id: 'mentor123',
          mentee_id: 'student123',
          title: 'Mentoria de Cardiologia',
          status: MentorshipStatus.ACTIVE,
          start_date: new Date().toISOString(),
          end_date: null,
          meeting_frequency: MeetingFrequency.WEEKLY,
          meeting_count: 5,
          total_meetings: 12,
          completed_meetings: 5,
          objectives: ['Objetivo 1', 'Objetivo 2'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rating: null,
          feedback: null,
        },
        error: null,
      });

      mockSupabase.update.mockResolvedValueOnce({
        data: [
          {
            id: 'mentorship123',
            status: MentorshipStatus.COMPLETED,
            end_date: new Date().toISOString(),
            rating: 4.5,
            feedback: 'Excelente mentoria',
            updated_at: new Date().toISOString(),
          },
        ],
        error: null,
      });

      // Act
      await service.completeMentorship(
        'mentorship123',
        4.5,
        'Excelente mentoria',
      );

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('mentorships');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'mentorship123');
      expect(mockSupabase.update).toHaveBeenCalled();
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
        startDate: new Date(),
        endDate: null,
        meetingFrequency: MeetingFrequency.WEEKLY,
        meetingCount: 0,
        totalMeetings: 0,
        completedMeetings: 0,
        objectives: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        rating: null,
        feedback: null,
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mentorship123',
          status: MentorshipStatus.CANCELLED,
          mentor_id: '',
          mentee_id: '',
          title: '',
          start_date: new Date().toISOString(),
          end_date: null,
          meeting_frequency: MeetingFrequency.WEEKLY,
          meeting_count: 0,
          total_meetings: 0,
          completed_meetings: 0,
          objectives: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rating: null,
          feedback: null,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.completeMentorship('mentorship123')).rejects.toThrow(
        'Apenas mentorias ativas podem ser completadas',
      );
    });
  });
});
