import { SupabaseMentorProfileService } from '../services';
import {
  MentorProfile,
  CreateMentorProfilePayload,
  UpdateMentorProfilePayload,
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
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  }),
}));

// Mock do uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

// Configuração das variáveis de ambiente para o Supabase
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

describe('MentorProfileService', () => {
  let service: SupabaseMentorProfileService;
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
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    // Injetar o mock no serviço
    service = new SupabaseMentorProfileService();
    (service as any).supabase = mockSupabase;
  });

  describe('createMentorProfile', () => {
    it('deve criar um perfil de mentor com sucesso', async () => {
      // Arrange
      const mockUserData = { role: 'MENTOR' };
      const mockUserExists = true;
      const mockProfileExists = false;

      // Configuração dos mocks para verificação do usuário
      mockSupabase.select.mockImplementation(() => {
        if (
          mockSupabase.from.mock.calls[
            mockSupabase.from.mock.calls.length - 1
          ][0] === 'users'
        ) {
          return {
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUserExists ? mockUserData : null,
                error: null,
              }),
            }),
          };
        }
        return {
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfileExists ? {} : null,
              error: null,
            }),
          }),
        };
      });

      // Mock para inserção
      mockSupabase.insert.mockResolvedValue({
        data: [{ id: 'mocked-uuid' }],
        error: null,
      });

      // Payload de teste
      const profileData: CreateMentorProfilePayload = {
        userId: 'user123',
        specialties: ['Cardiologia'],
        biography: 'Médico experiente',
        experience: ['Hospital XYZ por 5 anos'],
        education: ['Faculdade ABC'],
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
          { days: [3], startTime: '14:00', endTime: '18:00' },
        ],
      };

      // Act
      const result = await service.createMentorProfile(profileData);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from).toHaveBeenCalledWith('mentor_profiles');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(result).toMatchObject({
        userId: 'user123',
        specialties: ['Cardiologia'],
        biography: 'Médico experiente',
        experience: ['Hospital XYZ por 5 anos'],
        education: ['Faculdade ABC'],
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
          { days: [3], startTime: '14:00', endTime: '18:00' },
        ],
        rating: 0,
        totalSessions: 0,
      });
    });

    it('deve lançar erro se o usuário não existir', async () => {
      // Arrange
      mockSupabase.select.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const profileData: CreateMentorProfilePayload = {
        userId: 'nonexistent',
        specialties: ['Cardiologia'],
        biography: 'bio',
        experience: ['exp'],
        education: ['edu'],
        availability: [{ days: [1], startTime: '08:00', endTime: '12:00' }],
      };

      // Act & Assert
      await expect(service.createMentorProfile(profileData)).rejects.toThrow(
        'Usuário com ID nonexistent não encontrado',
      );
    });

    it('deve lançar erro se o usuário não for mentor', async () => {
      // Arrange
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ role: 'STUDENT' }),
      });

      const profileData: CreateMentorProfilePayload = {
        userId: 'student123',
        specialties: ['Cardiologia'],
        biography: 'bio',
        experience: ['exp'],
        education: ['edu'],
        availability: [{ days: [1], startTime: '08:00', endTime: '12:00' }],
      };

      // Act & Assert
      await expect(service.createMentorProfile(profileData)).rejects.toThrow(
        'Usuário com ID student123 não é um mentor',
      );
    });
  });

  describe('getMentorProfileByUserId', () => {
    it('deve retornar o perfil do mentor quando existir', async () => {
      // Arrange
      const mockProfile: MentorProfile = {
        id: 'user123',
        userId: 'user123',
        specialties: ['Cardiologia'],
        biography: 'Médico experiente',
        experience: ['Hospital XYZ por 5 anos'],
        education: ['Faculdade ABC'],
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
          { days: [3], startTime: '14:00', endTime: '18:00' },
        ],
        rating: 4.5,
        totalSessions: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => mockProfile,
      });

      // Act
      const result = await service.getMentorProfileByUserId('user123');

      // Assert
      expect(mockCollection).toHaveBeenCalledWith('mentor_profiles');
      expect(mockDoc).toHaveBeenCalledWith('user123');
      expect(result).toEqual(mockProfile);
    });

    it('deve retornar null quando o perfil não existir', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: false });

      // Act
      const result = await service.getMentorProfileByUserId('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateMentorProfile', () => {
    it('deve atualizar o perfil do mentor com sucesso', async () => {
      // Arrange
      const mockProfile: MentorProfile = {
        id: 'user123',
        userId: 'user123',
        specialties: ['Cardiologia'],
        biography: 'Médico experiente',
        experience: ['Hospital XYZ por 5 anos'],
        education: ['Faculdade ABC'],
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
          { days: [3], startTime: '14:00', endTime: '18:00' },
        ],
        rating: 4.5,
        totalSessions: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGet.mockImplementation(() => {
        return Promise.resolve({
          exists: true,
          data: () => mockProfile,
        });
      });

      const updateData: UpdateMentorProfilePayload = {
        biography: 'Médico experiente atualizado',
        specialties: ['Cardiologia', 'Clínica Geral'],
      };

      // Act
      await service.updateMentorProfile('user123', updateData);

      // Assert
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        biography: 'Médico experiente atualizado',
        specialties: ['Cardiologia', 'Clínica Geral'],
        updatedAt: expect.anything(),
      });
    });

    it('deve retornar null quando o perfil não existir', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: false });

      // Act
      const result = await service.updateMentorProfile('nonexistent', {
        biography: 'test',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('isMentor', () => {
    it('deve retornar true quando o usuário for mentor', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: true });

      // Act
      const result = await service.isMentor('user123');

      // Assert
      expect(result).toBe(true);
    });

    it('deve retornar false quando o usuário não for mentor', async () => {
      // Arrange
      mockGet.mockResolvedValue({ exists: false });

      // Act
      const result = await service.isMentor('student123');

      // Assert
      expect(result).toBe(false);
    });
  });
});
