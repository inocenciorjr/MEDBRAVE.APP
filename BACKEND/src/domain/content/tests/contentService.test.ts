// Testes unitários para ContentService
// Implementação inicial - esqueleto
import { ContentService } from '../../../infra/content/supabase/contentService';

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    service = new ContentService();
  });

  it('deve criar um artigo', async () => {
    // TODO: Implementar teste real
    expect(service.createContent).toBeDefined();
  });

  it('deve buscar um artigo por ID', async () => {
    expect(service.getContentById).toBeDefined();
  });

  it('deve atualizar um artigo', async () => {
    expect(service.updateContent).toBeDefined();
  });

  it('deve deletar um artigo', async () => {
    expect(service.deleteContent).toBeDefined();
  });

  it('deve listar artigos', async () => {
    expect(service.listContent).toBeDefined();
  });
});
