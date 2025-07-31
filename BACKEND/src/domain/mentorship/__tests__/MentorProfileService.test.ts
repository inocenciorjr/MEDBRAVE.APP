import { FirebaseMentorProfileService } from '../services';
import { MentorProfile, CreateMentorProfilePayload, UpdateMentorProfilePayload } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock do Firestore
jest.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    now: jest.fn().mockReturnValue({
      toMillis: () => Date.now(),
    }),
  };

  return {
    Timestamp: mockTimestamp,
  };
});

describe('MentorProfileService', () => {
  let service: FirebaseMentorProfileService;
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
      get: mockGet,
    });

    // Configuração do mock do Firestore
    mockFirestore = {
      collection: mockCollection,
    };

    // Injetar o mock no serviço
    service = new FirebaseMentorProfileService(mockFirestore);
  });

  describe('createMentorProfile', () => {
    it('deve criar um perfil de mentor com sucesso', async () => {
      // Arrange
      const mockUserData = { role: 'MENTOR' };
      const mockUserExists = true;
      const mockProfileExists = false;

      // Configuração dos mocks para verificação do usuário
      mockGet.mockImplementation((path: string) => {
        if (path === 'users/user123') {
          return Promise.resolve({
            exists: mockUserExists,
            data: () => mockUserData,
          });
        }
        return Promise.resolve({
          exists: mockProfileExists,
          data: () => null,
        });
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
      expect(mockCollection).toHaveBeenCalledWith('users');
      expect(mockDoc).toHaveBeenCalledWith('user123');
      expect(mockGet).toHaveBeenCalled();
      expect(mockCollection).toHaveBeenCalledWith('mentor_profiles');
      expect(mockSet).toHaveBeenCalled();
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
      mockGet.mockResolvedValue({ exists: false });

      const profileData: CreateMentorProfilePayload = {
        userId: 'nonexistent',
        specialties: ['Cardiologia'],
        biography: 'bio',
        experience: ['exp'],
        education: ['edu'],
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
        ],
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
        availability: [
          { days: [1], startTime: '08:00', endTime: '12:00' },
        ],
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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
      const result = await service.updateMentorProfile('nonexistent', { biography: 'test' });

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
