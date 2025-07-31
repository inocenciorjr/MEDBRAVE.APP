import request from 'supertest';
import express from 'express';
import { firestore } from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

import { createSimulatedExamModule } from '../../factory';
import { SimulatedExam, SimulatedExamDifficulty, SimulatedExamStatus } from '../../types';

// Mock do middleware de autenticação
jest.mock('../../../../middleware/auth', () => ({
  auth: jest.fn(() => (req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: 'test-user-id',
      role: 'student',
      email: 'test@example.com',
      emailVerified: true,
    };
    next();
  }),
}));

// Configuração inicial para testes
let app: express.Express;
let db: firestore.Firestore;
let testExamIds: string[] = [];

// Configurar o app e o mock do Firestore antes dos testes
beforeAll(async () => {
  // Inicializar o Firebase Admin (pode usar emulador para testes)
  if (!firestore.Firestore.prototype.collection) {
    initializeApp({
      projectId: 'medforum-test',
    });
  }

  db = firestore();

  // Criar o app Express com as rotas de simulados
  app = express();
  app.use(express.json());
  app.use('/simulated-exams', createSimulatedExamModule(db));
});

// Funções auxiliares
const createTestExam = async (overrides: Partial<SimulatedExam> = {}): Promise<SimulatedExam> => {
  const examId = uuidv4();
  const now = Timestamp.now();

  const exam: SimulatedExam = {
    id: examId,
    title: `Simulado de Teste ${examId.substring(0, 6)}`,
    description: 'Descrição do simulado de teste',
    timeLimit: 60,
    questions: [
      { id: uuidv4(), questionId: 'q1', order: 1, points: 1 },
      { id: uuidv4(), questionId: 'q2', order: 2, points: 2 },
    ],
    questionIds: ['q1', 'q2'],
    totalQuestions: 2,
    totalPoints: 3,
    difficulty: SimulatedExamDifficulty.MEDIUM,
    filterIds: [],
    subFilterIds: [],
    status: SimulatedExamStatus.PUBLISHED,
    isPublic: true,
    createdBy: 'test-user-id',
    createdAt: now,
    updatedAt: now,
    tags: ['teste', 'integração'],
    randomize: false,
    ...overrides,
  };

  await db.collection('simulatedExams').doc(examId).set(exam);
  testExamIds.push(examId);

  return exam;
};

// Limpar dados de teste após testes
afterAll(async () => {
  // Excluir simulados de teste
  const batch = db.batch();
  for (const examId of testExamIds) {
    batch.delete(db.collection('simulatedExams').doc(examId));

    // Excluir resultados relacionados
    const resultsSnapshot = await db
      .collection('simulatedExamResults')
      .where('examId', '==', examId)
      .get();

    resultsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
  }

  await batch.commit();
});

// Testes de API
describe('API de Simulados (Integração)', () => {
  describe('POST /simulated-exams', () => {
    it('deve criar um novo simulado', async () => {
      const response = await request(app)
        .post('/simulated-exams')
        .send({
          title: 'Simulado de Teste Integração',
          description: 'Descrição do simulado de teste',
          timeLimit: 60,
          questions: [
            { questionId: 'q1', order: 1, points: 1 },
            { questionId: 'q2', order: 2, points: 2 },
          ],
          difficulty: SimulatedExamDifficulty.MEDIUM,
          isPublic: true,
          tags: ['teste', 'integração'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Simulado de Teste Integração');
      expect(response.body.data.questions.length).toBe(2);

      // Adicionar ID para limpeza posterior
      testExamIds.push(response.body.data.id);
    });
  });

  describe('GET /simulated-exams/:id', () => {
    it('deve obter um simulado pelo ID', async () => {
      // Criar um simulado para testar
      const testExam = await createTestExam();

      const response = await request(app).get(`/simulated-exams/${testExam.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(testExam.id);
      expect(response.body.data.title).toBe(testExam.title);
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const response = await request(app).get('/simulated-exams/id-inexistente');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /simulated-exams', () => {
    beforeAll(async () => {
      // Criar alguns simulados para testar listagem
      await Promise.all([createTestExam(), createTestExam(), createTestExam()]);
    });

    it('deve listar simulados do usuário', async () => {
      const response = await request(app).get('/simulated-exams');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('exams');
      expect(Array.isArray(response.body.data.exams)).toBe(true);
      expect(response.body.data.exams.length).toBeGreaterThan(0);
    });

    it('deve filtrar simulados por status', async () => {
      // Criar um simulado com status específico
      await createTestExam({ status: SimulatedExamStatus.DRAFT });

      const response = await request(app)
        .get('/simulated-exams')
        .query({ status: SimulatedExamStatus.DRAFT });

      expect(response.status).toBe(200);
      expect(response.body.data.exams.length).toBeGreaterThan(0);
      expect(response.body.data.exams[0].status).toBe(SimulatedExamStatus.DRAFT);
    });
  });

  describe('PUT /simulated-exams/:id', () => {
    it('deve atualizar um simulado existente', async () => {
      // Criar um simulado para testar
      const testExam = await createTestExam({ status: SimulatedExamStatus.DRAFT });

      const response = await request(app).put(`/simulated-exams/${testExam.id}`).send({
        title: 'Título Atualizado',
        status: SimulatedExamStatus.PUBLISHED,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Título Atualizado');
      expect(response.body.data.status).toBe(SimulatedExamStatus.PUBLISHED);
      expect(response.body.data).toHaveProperty('publishedAt');
    });
  });

  describe('DELETE /simulated-exams/:id', () => {
    it('deve excluir um simulado existente', async () => {
      // Criar um simulado para testar
      const testExam = await createTestExam();

      // Excluir o simulado
      const deleteResponse = await request(app).delete(`/simulated-exams/${testExam.id}`);

      expect(deleteResponse.status).toBe(200);

      // Verificar se foi realmente excluído
      const getResponse = await request(app).get(`/simulated-exams/${testExam.id}`);

      expect(getResponse.status).toBe(404);

      // Remover da lista de limpeza
      testExamIds = testExamIds.filter(id => id !== testExam.id);
    });
  });
});
