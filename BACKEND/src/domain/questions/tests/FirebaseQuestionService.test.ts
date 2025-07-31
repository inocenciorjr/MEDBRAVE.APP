import { FirebaseQuestionService } from '../services/FirebaseQuestionService';
import { CreateQuestionPayload, Question, QuestionDifficulty, QuestionStatus } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock para o Firestore
const mockFirestore = {
  collection: jest.fn(),
};

// Mock para o DocumentReference
const mockDocumentReference = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
};

// Mock para o CollectionReference
const mockCollectionReference = {
  doc: jest.fn().mockReturnValue(mockDocumentReference),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  endAt: jest.fn().mockReturnThis(),
  get: jest.fn(),
  count: jest.fn().mockReturnThis(),
};

// Configuração inicial dos mocks
beforeEach(() => {
  jest.clearAllMocks();
  mockFirestore.collection.mockReturnValue(mockCollectionReference);
});

describe('FirebaseQuestionService', () => {
  let service: FirebaseQuestionService;

  beforeEach(() => {
    // Criar instância do serviço com o mock do Firestore
    service = new FirebaseQuestionService(mockFirestore as any);
  });

  // Teste de criação de questão
  describe('createQuestion', () => {
    it('deve criar uma questão com sucesso', async () => {
      // Preparar os mocks
      mockDocumentReference.set.mockResolvedValueOnce(undefined);

      // Dados de teste
      const questionData: CreateQuestionPayload = {
        statement: 'Qual é a capital do Brasil?',
        alternatives: [
          { id: '1', text: 'São Paulo', isCorrect: false, order: 0 },
          { id: '2', text: 'Rio de Janeiro', isCorrect: false, order: 1 },
          { id: '3', text: 'Brasília', isCorrect: true, order: 2 },
          { id: '4', text: 'Salvador', isCorrect: false, order: 3 },
        ],
        difficulty: QuestionDifficulty.MEDIUM,
        filterIds: ['filter1'],
        subFilterIds: ['subfilter1'],
        tags: ['geografia', 'capitais'],
        status: QuestionStatus.DRAFT,
        isActive: true,
        isAnnulled: false,
        createdBy: 'user1',
      };

      // Executar o método
      const result = await service.createQuestion(questionData);

      // Verificar resultado
      expect(result).toHaveProperty('id');
      expect(result.statement).toBe('Qual é a capital do Brasil?');
      expect(result.alternatives.length).toBe(4);
      expect(result.alternatives[2].isCorrect).toBe(true);
      expect(result.difficulty).toBe(QuestionDifficulty.MEDIUM);
      expect(result.tags).toEqual(['geografia', 'capitais']);
      expect(result.status).toBe(QuestionStatus.DRAFT);

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalled();
      expect(mockDocumentReference.set).toHaveBeenCalled();
    });
  });

  // Teste de obtenção de questão por ID
  describe('getQuestionById', () => {
    it('deve retornar uma questão quando ela existe', async () => {
      // Preparar os mocks
      const mockQuestion: Question = {
        id: 'question1',
        statement: 'Qual é a capital do Brasil?',
        alternatives: [
          { id: '1', text: 'São Paulo', isCorrect: false, order: 0 },
          { id: '2', text: 'Rio de Janeiro', isCorrect: false, order: 1 },
          { id: '3', text: 'Brasília', isCorrect: true, order: 2 },
          { id: '4', text: 'Salvador', isCorrect: false, order: 3 },
        ],
        difficulty: QuestionDifficulty.MEDIUM,
        filterIds: ['filter1'],
        subFilterIds: ['subfilter1'],
        tags: ['geografia', 'capitais'],
        status: QuestionStatus.PUBLISHED,
        isActive: true,
        isAnnulled: false,
        createdBy: 'user1',
        reviewCount: 0,
        averageRating: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockDocumentReference.get.mockResolvedValueOnce({
        exists: true,
        id: 'question1',
        data: () => mockQuestion,
      });

      // Executar o método
      const result = await service.getQuestionById('question1');

      // Verificar resultado
      expect(result).not.toBeNull();
      expect(result?.id).toBe('question1');
      expect(result?.statement).toBe('Qual é a capital do Brasil?');

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('question1');
      expect(mockDocumentReference.get).toHaveBeenCalled();
    });

    it('deve retornar null quando a questão não existe', async () => {
      // Preparar os mocks
      mockDocumentReference.get.mockResolvedValueOnce({
        exists: false,
      });

      // Executar o método
      const result = await service.getQuestionById('nonexistent');

      // Verificar resultado
      expect(result).toBeNull();

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('nonexistent');
      expect(mockDocumentReference.get).toHaveBeenCalled();
    });
  });

  // Teste de atualização de questão
  describe('updateQuestion', () => {
    it('deve atualizar uma questão existente', async () => {
      // Preparar os mocks
      const existingQuestion: Question = {
        id: 'question1',
        statement: 'Qual é a capital do Brasil?',
        alternatives: [
          { id: '1', text: 'São Paulo', isCorrect: false, order: 0 },
          { id: '2', text: 'Rio de Janeiro', isCorrect: false, order: 1 },
          { id: '3', text: 'Brasília', isCorrect: true, order: 2 },
          { id: '4', text: 'Salvador', isCorrect: false, order: 3 },
        ],
        difficulty: QuestionDifficulty.MEDIUM,
        filterIds: ['filter1'],
        subFilterIds: ['subfilter1'],
        tags: ['geografia', 'capitais'],
        status: QuestionStatus.DRAFT,
        isActive: true,
        isAnnulled: false,
        createdBy: 'user1',
        reviewCount: 0,
        averageRating: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockDocumentReference.get.mockResolvedValueOnce({
        exists: true,
        id: 'question1',
        data: () => existingQuestion,
      });

      mockDocumentReference.update.mockResolvedValueOnce(undefined);

      const updatedQuestion = {
        ...existingQuestion,
        statement: 'Qual é a capital atual do Brasil?',
        tags: ['geografia', 'capitais', 'brasil'],
        updatedAt: Timestamp.now(),
      };

      mockDocumentReference.get.mockResolvedValueOnce({
        exists: true,
        id: 'question1',
        data: () => updatedQuestion,
      });

      // Executar o método
      const result = await service.updateQuestion('question1', {
        statement: 'Qual é a capital atual do Brasil?',
        tags: ['geografia', 'capitais', 'brasil'],
      });

      // Verificar resultado
      expect(result).not.toBeNull();
      expect(result?.statement).toBe('Qual é a capital atual do Brasil?');
      expect(result?.tags).toContain('brasil');

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('question1');
      expect(mockDocumentReference.update).toHaveBeenCalled();
    });

    it('deve retornar null quando a questão não existe', async () => {
      // Preparar os mocks
      mockDocumentReference.get.mockResolvedValueOnce({
        exists: false,
      });

      // Executar o método
      const result = await service.updateQuestion('nonexistent', {
        statement: 'Nova pergunta',
      });

      // Verificar resultado
      expect(result).toBeNull();

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('nonexistent');
      expect(mockDocumentReference.update).not.toHaveBeenCalled();
    });
  });

  // Teste de exclusão de questão (soft delete)
  describe('deleteQuestion', () => {
    it('deve arquivar uma questão existente (soft delete)', async () => {
      // Preparar os mocks
      const existingQuestion: Question = {
        id: 'question1',
        statement: 'Qual é a capital do Brasil?',
        alternatives: [
          { id: '1', text: 'São Paulo', isCorrect: false, order: 0 },
          { id: '2', text: 'Rio de Janeiro', isCorrect: false, order: 1 },
          { id: '3', text: 'Brasília', isCorrect: true, order: 2 },
          { id: '4', text: 'Salvador', isCorrect: false, order: 3 },
        ],
        difficulty: QuestionDifficulty.MEDIUM,
        filterIds: ['filter1'],
        subFilterIds: ['subfilter1'],
        tags: ['geografia', 'capitais'],
        status: QuestionStatus.PUBLISHED,
        isActive: true,
        isAnnulled: false,
        createdBy: 'user1',
        reviewCount: 0,
        averageRating: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      mockDocumentReference.get.mockResolvedValueOnce({
        exists: true,
        id: 'question1',
        data: () => existingQuestion,
      });

      mockDocumentReference.update.mockResolvedValueOnce(undefined);

      const deletedQuestion = {
        ...existingQuestion,
        status: QuestionStatus.ARCHIVED,
        isActive: false,
        updatedAt: Timestamp.now(),
      };

      mockDocumentReference.get.mockResolvedValueOnce({
        exists: true,
        id: 'question1',
        data: () => deletedQuestion,
      });

      // Executar o método
      const result = await service.deleteQuestion('question1');

      // Verificar resultado
      expect(result).not.toBeNull();
      expect(result?.status).toBe(QuestionStatus.ARCHIVED);
      expect(result?.isActive).toBe(false);

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('question1');
      expect(mockDocumentReference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: QuestionStatus.ARCHIVED,
          isActive: false,
        }),
      );
    });

    it('deve retornar null quando a questão não existe', async () => {
      // Preparar os mocks
      mockDocumentReference.get.mockResolvedValueOnce({
        exists: false,
      });

      // Executar o método
      const result = await service.deleteQuestion('nonexistent');

      // Verificar resultado
      expect(result).toBeNull();

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.doc).toHaveBeenCalledWith('nonexistent');
      expect(mockDocumentReference.update).not.toHaveBeenCalled();
    });
  });

  // Teste de listagem de questões
  describe('listQuestions', () => {
    it('deve listar questões com filtros', async () => {
      // Preparar os mocks
      const mockQuestions = [
        {
          id: 'question1',
          statement: 'Questão 1',
          alternatives: [],
          difficulty: QuestionDifficulty.EASY,
          filterIds: ['filter1'],
          subFilterIds: ['subfilter1'],
          tags: ['tag1'],
          status: QuestionStatus.PUBLISHED,
          isActive: true,
          isAnnulled: false,
          createdBy: 'user1',
          reviewCount: 0,
          averageRating: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        {
          id: 'question2',
          statement: 'Questão 2',
          alternatives: [],
          difficulty: QuestionDifficulty.MEDIUM,
          filterIds: ['filter1'],
          subFilterIds: ['subfilter2'],
          tags: ['tag2'],
          status: QuestionStatus.PUBLISHED,
          isActive: true,
          isAnnulled: false,
          createdBy: 'user1',
          reviewCount: 0,
          averageRating: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
      ];

      mockCollectionReference.get.mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: mockQuestions.map(q => ({
          id: q.id,
          exists: true,
          data: () => q,
        })),
      });

      mockCollectionReference.count.mockReturnValue({
        get: jest.fn().mockResolvedValueOnce({
          data: () => ({ count: 2 }),
        }),
      });

      // Executar o método
      const result = await service.listQuestions({
        status: QuestionStatus.PUBLISHED,
        filterIds: ['filter1'],
      });

      // Verificar resultado
      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.items[0].statement).toBe('Questão 1');
      expect(result.items[1].statement).toBe('Questão 2');

      // Verificar chamadas de mock
      expect(mockFirestore.collection).toHaveBeenCalledWith('questions');
      expect(mockCollectionReference.where).toHaveBeenCalledWith(
        'status',
        '==',
        QuestionStatus.PUBLISHED,
      );
      expect(mockCollectionReference.where).toHaveBeenCalledWith(
        'filterIds',
        'array-contains-any',
        ['filter1'],
      );
    });
  });
});
