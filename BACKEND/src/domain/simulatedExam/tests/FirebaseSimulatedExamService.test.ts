import { FirebaseSimulatedExamService } from '../services/FirebaseSimulatedExamService';
import {
  CreateSimulatedExamPayload,
  SimulatedExam,
  SimulatedExamDifficulty,
  SimulatedExamStatus,
} from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock para o Firestore
const mockFirestore = {
  collection: jest.fn(),
  runTransaction: jest.fn(),
  FieldPath: {
    documentId: jest.fn().mockReturnValue('id'),
  },
};

// Mock para o DocumentReference
const mockDocumentReference = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock para o CollectionReference
const mockCollectionReference = {
  doc: jest.fn().mockReturnValue(mockDocumentReference),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  get: jest.fn(),
  count: jest.fn().mockReturnThis(),
};

// Mock para o QuerySnapshot
const mockQuerySnapshot = {
  empty: false,
  size: 2,
  docs: [],
};

// Mock para o CountSnapshot
const mockCountSnapshot = {
  data: jest.fn().mockReturnValue({ count: 10 }),
};

// Configuração inicial dos mocks
beforeEach(() => {
  jest.clearAllMocks();
  mockFirestore.collection.mockReturnValue(mockCollectionReference);
  mockCollectionReference.doc.mockReturnValue(mockDocumentReference);
  mockCollectionReference.get.mockResolvedValue(mockQuerySnapshot);
  mockCollectionReference.count.mockReturnValue({
    get: jest.fn().mockResolvedValue(mockCountSnapshot),
  });
  mockDocumentReference.get.mockResolvedValue({
    exists: true,
    id: 'test-id',
    data: jest.fn().mockReturnValue({}),
  });
});

describe('FirebaseSimulatedExamService', () => {
  let service: FirebaseSimulatedExamService;

  beforeEach(() => {
    service = new FirebaseSimulatedExamService(mockFirestore as any);
  });

  describe('createSimulatedExam', () => {
    it('deve criar um novo simulado', async () => {
      // Configurar o mock para o set
      mockDocumentReference.set.mockResolvedValue({});

      // Dados de teste
      const examData: CreateSimulatedExamPayload = {
        title: 'Simulado de Teste',
        description: 'Descrição do simulado',
        timeLimit: 60,
        questions: [
          { questionId: 'q1', order: 1, points: 1 },
          { questionId: 'q2', order: 2, points: 2 },
        ],
        difficulty: SimulatedExamDifficulty.MEDIUM,
        createdBy: 'user-1',
      };

      // Executar o método
      const result = await service.createSimulatedExam(examData);

      // Verificações
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExams');
      expect(mockDocumentReference.set).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(examData.title);
      expect(result.description).toBe(examData.description);
      expect(result.timeLimit).toBe(examData.timeLimit);
      expect(result.questions.length).toBe(2);
      expect(result.totalQuestions).toBe(2);
      expect(result.totalPoints).toBe(3);
      expect(result.difficulty).toBe(SimulatedExamDifficulty.MEDIUM);
      expect(result.createdBy).toBe('user-1');
      expect(result.status).toBe(SimulatedExamStatus.DRAFT);
    });
  });

  describe('getSimulatedExamById', () => {
    it('deve retornar um simulado pelo ID', async () => {
      // Configurar o mock para o get
      const mockExam: SimulatedExam = {
        id: 'exam-1',
        title: 'Simulado de Teste',
        description: 'Descrição do simulado',
        timeLimit: 60,
        questions: [
          { id: 'sq1', questionId: 'q1', order: 1, points: 1 },
          { id: 'sq2', questionId: 'q2', order: 2, points: 2 },
        ],
        questionIds: ['q1', 'q2'],
        totalQuestions: 2,
        totalPoints: 3,
        difficulty: SimulatedExamDifficulty.MEDIUM,
        filterIds: [],
        subFilterIds: [],
        status: SimulatedExamStatus.PUBLISHED,
        isPublic: true,
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: [],
        randomize: false,
      };

      mockDocumentReference.get.mockResolvedValue({
        exists: true,
        id: 'exam-1',
        data: jest.fn().mockReturnValue(mockExam),
      });

      // Executar o método
      const result = await service.getSimulatedExamById('exam-1');

      // Verificações
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExams');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('exam-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('exam-1');
      expect(result?.title).toBe(mockExam.title);
    });

    it('deve retornar null se o simulado não existir', async () => {
      // Configurar o mock para o get
      mockDocumentReference.get.mockResolvedValue({
        exists: false,
      });

      // Executar o método
      const result = await service.getSimulatedExamById('nonexistent-id');

      // Verificações
      expect(result).toBeNull();
    });
  });

  describe('updateSimulatedExam', () => {
    it('deve atualizar um simulado existente', async () => {
      // Configurar o mock para o get e update
      const mockExam: SimulatedExam = {
        id: 'exam-1',
        title: 'Simulado Original',
        description: 'Descrição original',
        timeLimit: 60,
        questions: [{ id: 'sq1', questionId: 'q1', order: 1, points: 1 }],
        questionIds: ['q1'],
        totalQuestions: 1,
        totalPoints: 1,
        difficulty: SimulatedExamDifficulty.EASY,
        filterIds: [],
        subFilterIds: [],
        status: SimulatedExamStatus.DRAFT,
        isPublic: false,
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: [],
        randomize: false,
      };

      mockDocumentReference.get
        .mockResolvedValueOnce({
          exists: true,
          id: 'exam-1',
          data: jest.fn().mockReturnValue(mockExam),
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'exam-1',
          data: jest.fn().mockReturnValue({
            ...mockExam,
            title: 'Simulado Atualizado',
            status: SimulatedExamStatus.PUBLISHED,
            publishedAt: Timestamp.now(),
          }),
        });

      mockDocumentReference.update.mockResolvedValue({});

      // Executar o método
      const result = await service.updateSimulatedExam('exam-1', {
        title: 'Simulado Atualizado',
        status: SimulatedExamStatus.PUBLISHED,
      });

      // Verificações
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExams');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('exam-1');
      expect(mockDocumentReference.update).toHaveBeenCalled();
      expect(result.title).toBe('Simulado Atualizado');
      expect(result.status).toBe(SimulatedExamStatus.PUBLISHED);
      expect(result).toHaveProperty('publishedAt');
    });
  });

  describe('listSimulatedExams', () => {
    it('deve listar simulados com paginação', async () => {
      // Configurar o mock para a busca
      const mockExams = [
        {
          id: 'exam-1',
          title: 'Simulado 1',
          description: 'Descrição 1',
          difficulty: SimulatedExamDifficulty.EASY,
          status: SimulatedExamStatus.PUBLISHED,
          isPublic: true,
          createdAt: Timestamp.now(),
          createdBy: 'user-1',
          filterIds: ['f1'],
          subFilterIds: ['sf1'],
          tags: ['tag1'],
        },
        {
          id: 'exam-2',
          title: 'Simulado 2',
          description: 'Descrição 2',
          difficulty: SimulatedExamDifficulty.MEDIUM,
          status: SimulatedExamStatus.PUBLISHED,
          isPublic: true,
          createdAt: Timestamp.now(),
          createdBy: 'user-2',
          filterIds: ['f2'],
          subFilterIds: ['sf2'],
          tags: ['tag2'],
        },
      ];

      (mockQuerySnapshot.docs as any) = mockExams.map(exam => ({
        id: exam.id,
        data: () => exam,
        exists: true,
      }));

      // Executar o método
      const result = await service.listSimulatedExams({
        limit: 10,
        page: 1,
        status: SimulatedExamStatus.PUBLISHED,
        isPublic: true,
      });

      // Verificações
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExams');
      expect(mockCollectionReference.where).toHaveBeenCalledWith(
        'status',
        '==',
        SimulatedExamStatus.PUBLISHED,
      );
      expect(mockCollectionReference.where).toHaveBeenCalledWith('isPublic', '==', true);
      expect(result.exams.length).toBe(2);
      expect(result.exams[0].id).toBe('exam-1');
      expect(result.exams[1].id).toBe('exam-2');
      expect(result.totalCount).toBe(10);
    });
  });

  describe('startSimulatedExam', () => {
    it('deve iniciar um simulado', async () => {
      // Configurar os mocks
      const mockExam: SimulatedExam = {
        id: 'exam-1',
        title: 'Simulado de Teste',
        description: 'Descrição do simulado',
        timeLimit: 60,
        questions: [
          { id: 'sq1', questionId: 'q1', order: 1, points: 1 },
          { id: 'sq2', questionId: 'q2', order: 2, points: 2 },
        ],
        questionIds: ['q1', 'q2'],
        totalQuestions: 2,
        totalPoints: 3,
        difficulty: SimulatedExamDifficulty.MEDIUM,
        filterIds: [],
        subFilterIds: [],
        status: SimulatedExamStatus.PUBLISHED,
        isPublic: true,
        createdBy: 'user-1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: [],
        randomize: false,
      };

      mockDocumentReference.get.mockResolvedValue({
        exists: true,
        id: 'exam-1',
        data: jest.fn().mockReturnValue(mockExam),
      });

      mockDocumentReference.set.mockResolvedValue({});

      // Executar o método
      const result = await service.startSimulatedExam({
        examId: 'exam-1',
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        device: 'desktop',
        browser: 'chrome',
      });

      // Verificações
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExams');
      expect(mockFirestore.collection).toHaveBeenCalledWith('simulatedExamResults');
      expect(mockDocumentReference.set).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result.examId).toBe('exam-1');
      expect(result.userId).toBe('user-1');
      expect(result.status).toBe('in_progress');
      expect(result.totalQuestions).toBe(2);
      expect(result.totalPoints).toBe(3);
      expect(result.score).toBe(0);
      expect(result.answers).toEqual([]);
    });
  });
});
