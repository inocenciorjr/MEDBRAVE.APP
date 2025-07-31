// Testes unitários para MediaController
// Implementação inicial - esqueleto
import request from 'supertest';
import express from 'express';
import mediaRoutes from '../routes/mediaRoutes';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/media', mediaRoutes);

describe('MediaController', () => {
  it('deve retornar 501 ao fazer upload de mídia', async () => {
    const res = await request(app).post('/media/upload').send({});
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao buscar mídia por ID', async () => {
    const res = await request(app).get('/media/1');
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao atualizar mídia', async () => {
    const res = await request(app).put('/media/1').send({});
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao deletar mídia', async () => {
    const res = await request(app).delete('/media/1');
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao listar mídias', async () => {
    const res = await request(app).get('/media');
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao criar pasta de mídia', async () => {
    const res = await request(app).post('/media/folders').send({});
    expect(res.status).toBe(501);
  });

  it('deve retornar 501 ao listar pastas de mídia', async () => {
    const res = await request(app).get('/media/folders');
    expect(res.status).toBe(501);
  });
});

describe('MediaController (real)', () => {
  it('deve fazer upload real de mídia e retornar os dados do arquivo', async () => {
    const testFilePath = path.join(__dirname, 'test-image.png');
    // Cria um arquivo fictício se não existir
    const fs = require('fs');
    if (!fs.existsSync(testFilePath)) {
      fs.writeFileSync(testFilePath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header
    }
    const res = await request(app)
      .post('/media/upload')
      .field('filename', 'test-image.png')
      .field('mimeType', 'image/png')
      .field('size', '4')
      .field('userId', 'test-user')
      .field('type', 'image')
      .attach('file', testFilePath);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('url');
    expect(res.body.filename).toBe('test-image.png');
    expect(res.body.mimeType).toBe('image/png');
    expect(res.body.userId).toBe('test-user');
    // Limpeza: remove o arquivo de teste
    fs.unlinkSync(testFilePath);
  });
});
