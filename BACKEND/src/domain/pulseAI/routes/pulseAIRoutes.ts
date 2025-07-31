import { Router } from 'express';
import { PulseAIController } from '../controllers/PulseAIController';
import { authMiddleware } from '../../auth/middleware/auth.middleware';
import { rateLimit } from '../../integration/middleware/rateLimit.middleware';

const router = Router();
const pulseAIController = new PulseAIController();

/**
 * 🩺 PULSE AI Routes
 * 
 * Todas as rotas do PULSE AI requerem autenticação
 * Rate limiting aplicado para prevenir abuso
 */

// Middleware para todas as rotas
router.use(authMiddleware);

/**
 * 🧠 POST /api/pulse-ai/analyze
 * Análise médica completa com diagnósticos diferenciais
 */
router.post(
  '/analyze',
  rateLimit('pulse-analyze', 10, 60000), // 10 req/min
  pulseAIController.analyzeMedicalCase
);

/**
 * 📚 POST /api/pulse-ai/educate
 * Conteúdo educacional médico personalizado
 */
router.post(
  '/educate',
  rateLimit('pulse-educate', 20, 60000), // 20 req/min
  pulseAIController.educateMedicalTopic
);

/**
 * ⚡ POST /api/pulse-ai/quick
 * Consultas rápidas e respostas concisas
 */
router.post(
  '/quick',
  rateLimit('pulse-quick', 30, 60000), // 30 req/min
  pulseAIController.quickMedicalQuery
);

/**
 * 📝 POST /api/pulse-ai/explain-question
 * Explicação de respostas de questões médicas
 */
router.post(
  '/explain-question',
  rateLimit('pulse-explain', 25, 60000), // 25 req/min
  pulseAIController.explainQuestionAnswer
);

/**
 * 📄 POST /api/pulse-ai/extract-questions
 * Extração de questões de PDFs/textos (apenas administradores)
 */
router.post(
  '/extract-questions',
  rateLimit('pulse-extract', 5, 60000), // 5 req/min
  pulseAIController.extractQuestionsFromContent
);

/**
 * 🏷️ POST /api/pulse-ai/categorize-questions
 * Categorização de questões com filtros do banco (apenas administradores)
 */
router.post(
  '/categorize-questions',
  rateLimit('pulse-categorize', 10, 60000), // 10 req/min
  pulseAIController.categorizeQuestions
);

/**
 * 🔍 POST /api/pulse-ai/detect-outdated
 * Detecção de questões desatualizadas via busca web (apenas administradores)
 */
router.post(
  '/detect-outdated',
  rateLimit('pulse-outdated', 5, 60000), // 5 req/min (limitado devido à busca web)
  pulseAIController.detectOutdatedQuestions
);

/**
 * 💬 POST /api/pulse-ai/generate-explanation
 * Gerar comentário explicativo automático para questões
 */
router.post(
  '/generate-explanation',
  rateLimit('pulse-explanation', 15, 60000), // 15 req/min
  pulseAIController.generateQuestionExplanation
);

/**
 * 👍👎 POST /api/pulse-ai/rate-explanation
 * Avaliar qualidade da explicação da IA
 */
router.post(
  '/rate-explanation',
  rateLimit('pulse-rating', 30, 60000), // 30 req/min
  pulseAIController.rateAIExplanation
);

/**
 * 🛡️ POST /api/pulse-ai/moderate
 * Moderação de conteúdo médico para compliance
 */
router.post(
  '/moderate',
  rateLimit('pulse-moderate', 50, 60000), // 50 req/min
  pulseAIController.moderateMedicalContent
);

/**
 * 📊 GET /api/pulse-ai/status
 * Status e saúde do sistema PULSE AI
 */
router.get(
  '/status',
  rateLimit('pulse-status', 100, 60000), // 100 req/min
  pulseAIController.getStatus
);

/**
 * ⚙️ PUT /api/pulse-ai/config
 * Configuração do sistema (apenas admin)
 */
router.put(
  '/config',
  rateLimit('pulse-config', 5, 60000), // 5 req/min
  pulseAIController.updateConfiguration
);

/**
 * 📈 GET /api/pulse-ai/analytics
 * Analytics e estatísticas de uso (apenas admin)
 */
router.get(
  '/analytics',
  rateLimit('pulse-analytics', 10, 60000), // 10 req/min
  pulseAIController.getAnalytics
);

/**
 * 🧪 POST /api/pulse-ai/test
 * Endpoint de teste (apenas desenvolvimento)
 */
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/test',
    rateLimit('pulse-test', 5, 60000), // 5 req/min
    pulseAIController.testSystem
  );
}

/**
 * 📄 POST /api/pulse-ai/convert-to-markdown
 * Conversão de documentos (HTML/PDF/DOCX) para Markdown estruturado (apenas administradores)
 */
router.post(
  '/convert-to-markdown',
  rateLimit('pulse-convert', 3, 60000), // 3 req/min (limitado devido ao processamento intensivo)
  pulseAIController.convertDocumentToMarkdown
);

export { router as pulseAIRoutes }; 