import {
  generateUniqueId,
  cleanupTestData,
} from '../../../../../tests/firebase-test-setup';
import { CreateFlashcardUseCase } from '../CreateFlashcardUseCase';
import { FirebaseFlashcardRepository } from '../../repositories/FirebaseFlashcardRepository';
import { CreateFlashcardDTO } from '../../types/flashcard.types';
import { AppError } from '../../../../../shared/errors/AppError';

describe('CreateFlashcardUseCase Firebase Integration Tests', () => {
  let repository: FirebaseFlashcardRepository;
  let createFlashcardUseCase: CreateFlashcardUseCase;
  let testUserId: string;
  let testDeckId: string;
  const createdFlashcardIds: string[] = [];

  beforeAll(async () => {
    // Inicializar repositório e caso de uso
    repository = new FirebaseFlashcardRepository();
    createFlashcardUseCase = new CreateFlashcardUseCase(repository);

    // Gerar IDs únicos para testes
    testUserId = generateUniqueId('testuser');
    testDeckId = generateUniqueId('testdeck');

    console.log(
      `Running tests with testUserId: ${testUserId} and testDeckId: ${testDeckId}`,
    );
  });

  afterAll(async () => {
    // Limpar dados de teste
    await cleanupTestData('flashcards');
  });

  it('should create a flashcard successfully', async () => {
    // Preparar dados de teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'Quais são os tipos de anticorpos?',
      backContent: 'IgA, IgD, IgE, IgG e IgM',
      personalNotes: 'Os anticorpos são produzidos pelos linfócitos B',
      tags: ['imunologia', 'bioquímica'],
    };

    // Executar teste
    const flashcard = await createFlashcardUseCase.execute(createDto);

    // Armazenar ID para limpeza posterior
    createdFlashcardIds.push(flashcard.id);

    // Verificar resultado
    expect(flashcard).toBeDefined();
    expect(flashcard.id).toBeDefined();
    expect(flashcard.userId).toBe(testUserId);
    expect(flashcard.deckId).toBe(testDeckId);
    expect(flashcard.frontContent).toBe(createDto.frontContent);
    expect(flashcard.backContent).toBe(createDto.backContent);
    expect(flashcard.personalNotes).toBe(createDto.personalNotes);
    expect(flashcard.tags).toEqual(
      expect.arrayContaining(createDto.tags ?? []),
    );

    // Verificar texto pesquisável
    expect(flashcard.searchableText).toContain('anticorpos');
    expect(flashcard.searchableText).toContain('iga');
  });

  it('should throw an error if userId is not provided', async () => {
    // Preparar dados inválidos
    const invalidDto: CreateFlashcardDTO = {
      userId: '', // Inválido
      deckId: testDeckId,
      frontContent: 'O que é inflamação?',
      backContent: 'Reação de defesa do organismo a uma agressão',
      tags: ['imunologia', 'patologia'],
    };

    // Verificar se lança erro
    await expect(createFlashcardUseCase.execute(invalidDto)).rejects.toThrow(
      AppError,
    );
  });

  it('should throw an error if deckId is not provided', async () => {
    // Preparar dados inválidos
    const invalidDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: '', // Inválido
      frontContent: 'O que é diabetes?',
      backContent: 'Doença metabólica caracterizada por hiperglicemia',
      tags: ['endocrinologia', 'metabologia'],
    };

    // Verificar se lança erro
    await expect(createFlashcardUseCase.execute(invalidDto)).rejects.toThrow(
      AppError,
    );
  });

  it('should throw an error if frontContent is not provided', async () => {
    // Preparar dados inválidos
    const invalidDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: '', // Inválido
      backContent:
        'Conjunto de sintomas neurológicos causados por deficiência de oxigênio',
      tags: ['neurologia', 'emergência'],
    };

    // Verificar se lança erro
    await expect(createFlashcardUseCase.execute(invalidDto)).rejects.toThrow(
      AppError,
    );
  });

  it('should throw an error if backContent is not provided', async () => {
    // Preparar dados inválidos
    const invalidDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é hipóxia cerebral?',
      backContent: '', // Inválido
      tags: ['neurologia', 'emergência'],
    };

    // Verificar se lança erro
    await expect(createFlashcardUseCase.execute(invalidDto)).rejects.toThrow(
      AppError,
    );
  });

  it('should use empty array for tags if not provided', async () => {
    // Preparar dados sem tags
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é endoscopia?',
      backContent: 'Exame que permite visualizar o interior de órgãos ocos',
      personalNotes: 'Método diagnóstico importante na gastroenterologia',
      // Tags omitidas intencionalmente
    };

    // Executar teste
    const flashcard = await createFlashcardUseCase.execute(createDto);

    // Armazenar ID para limpeza posterior
    createdFlashcardIds.push(flashcard.id);

    // Verificar que tags é um array vazio
    expect(flashcard.tags).toBeDefined();
    expect(Array.isArray(flashcard.tags)).toBeTruthy();
    expect(flashcard.tags.length).toBe(0);
  });

  it('should use empty string for personalNotes if not provided', async () => {
    // Preparar dados sem notas pessoais
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é otoscopia?',
      backContent: 'Exame que permite visualizar o canal auditivo e o tímpano',
      tags: ['otorrinolaringologia', 'exames'],
      // PersonalNotes omitidas intencionalmente
    };

    // Executar teste
    const flashcard = await createFlashcardUseCase.execute(createDto);

    // Armazenar ID para limpeza posterior
    createdFlashcardIds.push(flashcard.id);

    // Verificar que personalNotes é uma string vazia
    expect(flashcard.personalNotes).toBe('');
  });

  it('should persist flashcard to database', async () => {
    // Preparar dados de teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é miocardite?',
      backContent: 'Inflamação do músculo cardíaco',
      tags: ['cardiologia', 'patologia'],
    };

    // Criar flashcard
    const createdFlashcard = await createFlashcardUseCase.execute(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Buscar flashcard diretamente do repositório
    const foundFlashcard = await repository.findById(createdFlashcard.id);

    // Verificar se o flashcard foi persistido corretamente
    expect(foundFlashcard).not.toBeNull();
    if (foundFlashcard) {
      expect(foundFlashcard.id).toBe(createdFlashcard.id);
      expect(foundFlashcard.frontContent).toBe(createDto.frontContent);
      expect(foundFlashcard.backContent).toBe(createDto.backContent);
    }
  });
});
