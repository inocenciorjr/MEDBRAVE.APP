/**
 * Rotas de teste para WebSocket
 * APENAS PARA DESENVOLVIMENTO - REMOVER EM PRODUÇÃO
 */

import { Router } from 'express';
import { jobProgressEmitter } from '../services/jobProgressEmitter';

const router = Router();

/**
 * POST /api/test/websocket/emit
 * Emite eventos de teste para um jobId
 */
router.post('/emit', async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      error: 'jobId é obrigatório',
    });
  }

  try {
    console.log(`🧪 Emitindo eventos de teste para job: ${jobId}`);

    // Evento 1: Extração
    jobProgressEmitter.emitExtraction(
      jobId,
      'extracting',
      'Extraindo questão 1 de 5',
      1,
      5
    );

    await sleep(500);

    // Evento 2: Extração
    jobProgressEmitter.emitExtraction(
      jobId,
      'extracting',
      'Extraindo questão 3 de 5',
      3,
      5
    );

    await sleep(500);

    // Evento 3: Categorização
    jobProgressEmitter.emitCategorization(
      jobId,
      'categorizing',
      'Categorizando questão 2 de 5',
      2,
      5
    );

    await sleep(500);

    // Evento 4: Reescrita
    jobProgressEmitter.emitRewrite(
      jobId,
      'rewriting',
      'Reescrevendo comentário 4 de 5',
      4,
      5
    );

    await sleep(500);

    // Evento 5: Conclusão
    jobProgressEmitter.emitComplete(
      jobId,
      'Job de teste concluído com sucesso!'
    );

    return res.json({
      success: true,
      message: `5 eventos emitidos para job ${jobId}`,
    });
  } catch (error: any) {
    console.error('❌ Erro ao emitir eventos:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default router;
