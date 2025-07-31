// Testes unitários para ContentController
// Implementação inicial - esqueleto
import request from 'supertest';
import express from 'express';
import contentRoutes from '../routes/contentRoutes';
import { firestore } from '../../../config/firebaseAdmin';

const app = express();
app.use(express.json());
app.use('/content', contentRoutes);

const TEST_ARTICLE = {
  title: 'Artigo Teste',
  content: 'Conteúdo do artigo de teste',
  authorId: 'autor-teste',
  tags: ['tag1', 'tag2'],
  categoryId: 'cat-teste',
  status: 'DRAFT',
  summary: 'Resumo do artigo',
  isPublic: true,
};

describe('ContentController (real)', () => {
  let createdId: string;

  afterAll(async () => {
    // Limpa o artigo criado
    if (createdId) {
      await firestore.collection('articles').doc(createdId).delete();
    }
  });

  it('deve criar um artigo', async () => {
    const res = await request(app).post('/content').send(TEST_ARTICLE);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdId = res.body.id;
  });

  it('deve buscar o artigo criado por ID', async () => {
    const res = await request(app).get(`/content/${createdId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdId);
    expect(res.body.title).toBe(TEST_ARTICLE.title);
  });

  it('deve atualizar o artigo', async () => {
    const res = await request(app).put(`/content/${createdId}`).send({ title: 'Novo Título' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Novo Título');
  });

  it('deve listar artigos', async () => {
    const res = await request(app).get('/content');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find((a: any) => a.id === createdId)).toBeTruthy();
  });

  it('deve deletar o artigo', async () => {
    const res = await request(app).delete(`/content/${createdId}`);
    expect(res.status).toBe(204);
    // Verifica se foi removido
    const getRes = await request(app).get(`/content/${createdId}`);
    expect(getRes.status).toBe(404);
  });
});
