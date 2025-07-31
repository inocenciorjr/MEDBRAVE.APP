import {
  generateUniqueId,
  cleanupTestData,
} from '../../../../../tests/firebase-test-setup';
import { FirebaseFlashcardRepository } from '../FirebaseFlashcardRepository';
import { CreateFlashcardDTO, FlashcardStatus, ReviewQuality } from '../../types/flashcard.types';

describe('FirebaseFlashcardRepository Integration Tests', () => {
  let repository: FirebaseFlashcardRepository;
  let testUserId: string;
  let testDeckId: string;
  const createdFlashcardIds: string[] = [];

  beforeAll(async () => {
    // Inicializar repositório
    repository = new FirebaseFlashcardRepository();

    // Gerar IDs únicos para testes
    testUserId = generateUniqueId('testuser');
    testDeckId = generateUniqueId('testdeck');

    console.log(`Running tests with testUserId: ${testUserId} and testDeckId: ${testDeckId}`);
  });

  afterAll(async () => {
    // Limpar dados de teste
    await cleanupTestData('flashcards');
  });

  // Teste de criação
  it('should create a flashcard with valid data', async () => {
    // Preparar dados de teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é o coração?',
      backContent: 'Um órgão muscular oco que bombeia sangue através do sistema circulatório',
      personalNotes: 'Importante para a cardiologia',
      tags: ['anatomia', 'cardiologia'],
    };

    // Executar teste
    const createdFlashcard = await repository.create(createDto);

    // Armazenar ID para limpeza posterior
    createdFlashcardIds.push(createdFlashcard.id);

    // Verificar resultado
    expect(createdFlashcard).toBeDefined();
    expect(createdFlashcard.id).toBeDefined();
    expect(createdFlashcard.userId).toBe(testUserId);
    expect(createdFlashcard.deckId).toBe(testDeckId);
    expect(createdFlashcard.frontContent).toBe(createDto.frontContent);
    expect(createdFlashcard.backContent).toBe(createDto.backContent);
    expect(createdFlashcard.personalNotes).toBe(createDto.personalNotes);
    expect(createdFlashcard.tags).toEqual(expect.arrayContaining(createDto.tags ?? []));
    expect(createdFlashcard.status).toBe(FlashcardStatus.LEARNING);
    expect(createdFlashcard.searchableText).toContain('coração');
    expect(createdFlashcard.searchableText).toContain('órgão');
    expect(createdFlashcard.createdAt).toBeDefined();
    expect(createdFlashcard.updatedAt).toBeDefined();
  });

  // Teste de busca por ID
  it('should find a flashcard by ID', async () => {
    // Preparar dados de teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'Qual é a principal função do fígado?',
      backContent: 'Metabolizar nutrientes, filtrar o sangue e produzir bile',
      personalNotes: 'Revisar detalhes sobre o metabolismo',
      tags: ['anatomia', 'gastroenterologia'],
    };

    // Criar flashcard para teste
    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Buscar flashcard por ID
    const foundFlashcard = await repository.findById(createdFlashcard.id);

    // Verificar resultado
    expect(foundFlashcard).not.toBeNull();
    if (foundFlashcard) {
      expect(foundFlashcard.id).toBe(createdFlashcard.id);
      expect(foundFlashcard.frontContent).toBe(createDto.frontContent);
    }
  });

  // Teste de busca com verificação de usuário
  it('should return null when user is not authorized', async () => {
    // Preparar dados de teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é a medula espinhal?',
      backContent:
        'Parte do sistema nervoso central que transmite mensagens entre o cérebro e o corpo',
      tags: ['neurologia', 'anatomia'],
    };

    // Criar flashcard para teste
    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Buscar flashcard com ID de usuário diferente
    const foundFlashcard = await repository.findById(createdFlashcard.id);

    // Verificar resultado
    expect(foundFlashcard).toBeNull();
  });

  // Teste de busca por usuário
  it('should find all flashcards for a user', async () => {
    // Criar múltiplos flashcards para o mesmo usuário
    const createDtos: CreateFlashcardDTO[] = [
      {
        userId: testUserId,
        deckId: testDeckId,
        frontContent: 'O que são as plaquetas?',
        backContent: 'Fragmentos celulares que ajudam na coagulação sanguínea',
        tags: ['hematologia'],
      },
      {
        userId: testUserId,
        deckId: testDeckId,
        frontContent: 'O que é uma hemácia?',
        backContent: 'Uma célula sanguínea que transporta oxigênio',
        tags: ['hematologia'],
      },
    ];

    for (const dto of createDtos) {
      const created = await repository.create(dto);
      createdFlashcardIds.push(created.id);
    }

    // Buscar flashcards do usuário
    const result = await repository.findByUser(testUserId);

    // Verificar resultado
    expect(result).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result.total).toBeGreaterThanOrEqual(2);

    // Verificar se todos os flashcards pertencem ao usuário de teste
    result.items.forEach(flashcard => {
      expect(flashcard.userId).toBe(testUserId);
    });
  });

  // Teste de atualização
  it('should update a flashcard', async () => {
    // Criar flashcard para teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é um leucócito?',
      backContent: 'Uma célula de defesa do sistema imunológico',
      tags: ['hematologia', 'imunologia'],
    };

    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Atualizar flashcard
    const updateData = {
      frontContent: 'O que são os leucócitos?',
      backContent: 'Células brancas do sangue responsáveis pela defesa imunológica do organismo',
      tags: ['hematologia', 'imunologia', 'sangue'],
    };

    const updatedFlashcard = await repository.update(createdFlashcard.id, updateData);

    // Verificar resultado
    expect(updatedFlashcard).toBeDefined();
    expect(updatedFlashcard.id).toBe(createdFlashcard.id);
    expect(updatedFlashcard.frontContent).toBe(updateData.frontContent);
    expect(updatedFlashcard.backContent).toBe(updateData.backContent);
    expect(updatedFlashcard.tags).toEqual(expect.arrayContaining(updateData.tags ?? []));
    expect(updatedFlashcard.updatedAt).not.toEqual(createdFlashcard.updatedAt);

    // Verificar se o texto pesquisável foi atualizado
    expect(updatedFlashcard.searchableText).toContain('leucócitos');
    expect(updatedFlashcard.searchableText).toContain('defesa');
  });

  // Teste de exclusão
  it('should delete a flashcard', async () => {
    // Criar flashcard para teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é um eritrócito?',
      backContent: 'Outra denominação para hemácia, célula vermelha do sangue',
      tags: ['hematologia'],
    };

    const createdFlashcard = await repository.create(createDto);

    // Excluir flashcard
    await repository.delete(createdFlashcard.id);

    // Verificar se foi excluído
    const foundFlashcard = await repository.findById(createdFlashcard.id);
    expect(foundFlashcard).toBeNull();
  });

  // Teste de alternar arquivo
  it('should toggle archive status of a flashcard', async () => {
    // Criar flashcard para teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é a aorta?',
      backContent: 'A maior artéria do corpo humano',
      tags: ['anatomia', 'cardiologia'],
    };

    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Status inicial deve ser LEARNING
    expect(createdFlashcard.status).toBe(FlashcardStatus.LEARNING);

    // Arquivar flashcard
    const archivedFlashcard = await repository.toggleArchive(createdFlashcard.id);

    // Status deve ser alterado para ARCHIVED
    expect(archivedFlashcard.status).toBe(FlashcardStatus.ARCHIVED);

    // Desarquivar flashcard
    const unarchivedFlashcard = await repository.toggleArchive(createdFlashcard.id);

    // Status deve voltar para LEARNING
    expect(unarchivedFlashcard.status).toBe(FlashcardStatus.LEARNING);
  });

  // Teste de registro de revisão
  it('should record a flashcard review', async () => {
    // Criar flashcard para teste
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que são as plaquetas?',
      backContent: 'Fragmentos celulares que ajudam na coagulação sanguínea',
      tags: ['hematologia'],
    };

    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Registrar revisão com qualidade boa
    const reviewedFlashcard = await repository.recordReview(
      createdFlashcard.id,
      ReviewQuality.GOOD,
    );

    // Verificar resultado
    expect(reviewedFlashcard).toBeDefined();
    expect(reviewedFlashcard.srsData.repetitions).toBe(1);
    expect(reviewedFlashcard.srsData.interval).toBe(1); // 1 dia para primeira repetição correta
    expect(reviewedFlashcard.lastReviewedAt).toBeDefined();
    expect(reviewedFlashcard.nextReviewAt).toBeDefined();
  });

  // Teste de busca por texto
  it('should search flashcards by text query', async () => {
    // Criar flashcards para teste com textos específicos
    const createDtos: CreateFlashcardDTO[] = [
      {
        userId: testUserId,
        deckId: testDeckId,
        frontContent: 'Quais são os sintomas da hipertensão?',
        backContent: 'Dor de cabeça, tontura, visão borrada, entre outros',
        tags: ['cardiologia', 'doenças'],
      },
      {
        userId: testUserId,
        deckId: testDeckId,
        frontContent: 'O que causa hipertensão?',
        backContent: 'Fatores genéticos, estresse, dieta rica em sal, sedentarismo',
        tags: ['cardiologia', 'hipertensão'],
      },
    ];

    for (const dto of createDtos) {
      const created = await repository.create(dto);
      createdFlashcardIds.push(created.id);
    }

    // Buscar por termo específico
    const searchResult = await repository.search('hipertensão', testUserId, { page: 1, limit: 10 });

    // Verificar resultado
    expect(searchResult).toBeDefined();
    expect(searchResult.items.length).toBeGreaterThanOrEqual(2);
    expect(searchResult.items.some(f => f.frontContent.includes('sintomas'))).toBeTruthy();
    expect(searchResult.items.some(f => f.frontContent.includes('causa'))).toBeTruthy();
  });

  // Teste de busca por tag
  it('should search flashcards by tag', async () => {
    // Criar flashcards com tags específicas
    const createDto: CreateFlashcardDTO = {
      userId: testUserId,
      deckId: testDeckId,
      frontContent: 'O que é um eletrocardiograma?',
      backContent: 'Um exame que registra a atividade elétrica do coração',
      tags: ['cardiologia', 'exames', 'eletrocardiografia'],
    };

    const createdFlashcard = await repository.create(createDto);
    createdFlashcardIds.push(createdFlashcard.id);

    // Buscar por tag
    const searchResult = await repository.search('eletrocardiografia', testUserId, { page: 1, limit: 10 });

    // Verificar resultado
    expect(searchResult).toBeDefined();
    expect(searchResult.items.length).toBeGreaterThanOrEqual(1);
    expect(
      searchResult.items.some(
        f => f.tags.includes('eletrocardiografia') && f.frontContent.includes('eletrocardiograma'),
      ),
    ).toBeTruthy();
  });
});
