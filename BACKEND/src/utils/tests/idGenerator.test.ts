import {
  generateQuestionId,
  generateQuestionResponseId,
  generateQuestionRetentionId,
  sanitizeForId
} from '../idGenerator';

// Mock do Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        data: () => ({
          usernameSlug: 'joaosilva',
          displayName: 'João Silva'
        })
      }))
    }))
  }))
};

// Mock global do firestore
(global as any).firestore = mockFirestore;

describe('ID Generator', () => {
  describe('sanitizeForId', () => {
    it('deve sanitizar texto corretamente', () => {
      expect(sanitizeForId('Um homem de 45 anos')).toBe('umhomemde45anos');
      expect(sanitizeForId('Paciente com dor torácica')).toBe('pacientecomdortoracic');
      expect(sanitizeForId('Questão com acentos: ção, ã, é')).toBe('questaocomacentoscaoae');
    });

    it('deve limitar a 20 caracteres', () => {
      const longText = 'Este é um texto muito longo que deveria ser truncado';
      const result = sanitizeForId(longText);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toBe('esteeumuxtomuitolong');
    });

    it('deve remover caracteres especiais', () => {
      expect(sanitizeForId('Texto com @#$%^&*()!')).toBe('textocom');
      expect(sanitizeForId('123-456_789')).toBe('123-456-789');
    });

    it('deve tratar texto vazio', () => {
      expect(sanitizeForId('')).toBe('user');
      expect(sanitizeForId(null as any)).toBe('user');
      expect(sanitizeForId(undefined as any)).toBe('user');
    });
  });

  describe('generateQuestionId', () => {
    it('deve gerar ID no formato correto', () => {
      const statement = 'Um homem de 45 anos comparece ao hospital';
      const id = generateQuestionId(statement);
      
      expect(id).toMatch(/^umhomemde45anos-[A-Z0-9]{6}$/);
      expect(id.split('-')).toHaveLength(2);
      expect(id.split('-')[0]).toBe('umhomemde45anos');
      expect(id.split('-')[1]).toHaveLength(6);
    });

    it('deve gerar IDs únicos para o mesmo enunciado', () => {
      const statement = 'Paciente apresenta sintomas';
      const id1 = generateQuestionId(statement);
      const id2 = generateQuestionId(statement);
      
      expect(id1).not.toBe(id2);
      expect(id1.split('-')[0]).toBe(id2.split('-')[0]);
      expect(id1.split('-')[1]).not.toBe(id2.split('-')[1]);
    });

    it('deve lançar erro para enunciado inválido', () => {
      expect(() => generateQuestionId('')).toThrow('Enunciado da questão é obrigatório para gerar ID');
      expect(() => generateQuestionId(null as any)).toThrow('Enunciado da questão é obrigatório para gerar ID');
      expect(() => generateQuestionId(undefined as any)).toThrow('Enunciado da questão é obrigatório para gerar ID');
    });

    it('deve tratar enunciados com caracteres especiais', () => {
      const statement = 'Paciente de 30 anos, sexo feminino, apresenta dor abdominal';
      const id = generateQuestionId(statement);
      
      expect(id).toMatch(/^pacientede30anossexof-[A-Z0-9]{6}$/);
    });

    it('deve tratar enunciados muito curtos', () => {
      const statement = 'Dor';
      const id = generateQuestionId(statement);
      
      expect(id).toMatch(/^dor-[A-Z0-9]{6}$/);
    });
  });

  describe('generateQuestionResponseId', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('deve gerar ID de resposta no formato correto', async () => {
      const userId = 'user123';
      const questionId = 'umhomemde45anos-ABC123';
      
      const id = await generateQuestionResponseId(userId, questionId);
      
      expect(id).toMatch(/^joaosilva_umhomemde45anos-ABC123_\d+$/);
      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
    });

    it('deve usar displayName como fallback', async () => {
      // Mock para usuário sem usernameSlug
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            data: () => ({
              displayName: 'Maria Santos'
            })
          }))
        }))
      });

      const userId = 'user456';
      const questionId = 'pacientecom-XYZ789';
      
      const id = await generateQuestionResponseId(userId, questionId);
      
      expect(id).toMatch(/^mariasantos_pacientecom-XYZ789_\d+$/);
    });

    it('deve usar "user" como fallback final', async () => {
      // Mock para usuário sem dados
      mockFirestore.collection.mockReturnValue({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            data: () => ({})
          }))
        }))
      });

      const userId = 'user789';
      const questionId = 'questao-DEF456';
      
      const id = await generateQuestionResponseId(userId, questionId);
      
      expect(id).toMatch(/^user_questao-DEF456_\d+$/);
    });

    it('deve incluir timestamp único', async () => {
      const userId = 'user123';
      const questionId = 'questao-ABC123';
      
      const id1 = await generateQuestionResponseId(userId, questionId);
      // Pequeno delay para garantir timestamp diferente
      await new Promise(resolve => setTimeout(resolve, 1));
      const id2 = await generateQuestionResponseId(userId, questionId);
      
      expect(id1).not.toBe(id2);
      
      const timestamp1 = id1.split('_')[2];
      const timestamp2 = id2.split('_')[2];
      expect(parseInt(timestamp1)).toBeLessThan(parseInt(timestamp2));
    });
  });

  describe('generateQuestionRetentionId', () => {
    it('deve gerar ID de retenção no formato correto', () => {
      const userId = 'user123';
      const questionId = 'umhomemde45anos-ABC123';
      
      const id = generateQuestionRetentionId(userId, questionId);
      
      expect(id).toBe('user123_umhomemde45anos-ABC123');
    });

    it('deve ser determinístico para os mesmos parâmetros', () => {
      const userId = 'user456';
      const questionId = 'pacientecom-XYZ789';
      
      const id1 = generateQuestionRetentionId(userId, questionId);
      const id2 = generateQuestionRetentionId(userId, questionId);
      
      expect(id1).toBe(id2);
      expect(id1).toBe('user456_pacientecom-XYZ789');
    });

    it('deve gerar IDs diferentes para usuários diferentes', () => {
      const questionId = 'questao-ABC123';
      
      const id1 = generateQuestionRetentionId('user1', questionId);
      const id2 = generateQuestionRetentionId('user2', questionId);
      
      expect(id1).not.toBe(id2);
      expect(id1).toBe('user1_questao-ABC123');
      expect(id2).toBe('user2_questao-ABC123');
    });

    it('deve gerar IDs diferentes para questões diferentes', () => {
      const userId = 'user123';
      
      const id1 = generateQuestionRetentionId(userId, 'questao1-ABC');
      const id2 = generateQuestionRetentionId(userId, 'questao2-XYZ');
      
      expect(id1).not.toBe(id2);
      expect(id1).toBe('user123_questao1-ABC');
      expect(id2).toBe('user123_questao2-XYZ');
    });
  });

  describe('Integração', () => {
    it('deve funcionar em fluxo completo de questão', async () => {
      // 1. Criar questão
      const statement = 'Paciente de 65 anos apresenta dispneia';
      const questionId = generateQuestionId(statement);
      
      expect(questionId).toMatch(/^pacientede65anosapre-[A-Z0-9]{6}$/);
      
      // 2. Criar resposta
      const userId = 'user123';
      const responseId = await generateQuestionResponseId(userId, questionId);
      
      expect(responseId).toMatch(new RegExp(`^joaosilva_${questionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+$`));
      
      // 3. Criar retenção
      const retentionId = generateQuestionRetentionId(userId, questionId);
      
      expect(retentionId).toBe(`${userId}_${questionId}`);
      
      // Verificar que todos os IDs são únicos
      expect(questionId).not.toBe(responseId);
      expect(questionId).not.toBe(retentionId);
      expect(responseId).not.toBe(retentionId);
    });
  });
});