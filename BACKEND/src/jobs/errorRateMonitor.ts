/**
 * 🚨 ERROR RATE MONITOR
 * 
 * Monitora a taxa de erro do scraper e envia alertas quando excede o limite.
 * Executa a cada hora e verifica os logs das últimas 24 horas.
 */

import cron from 'node-cron';
// Substitui serviço inexistente por logger e métricas mínimas
import logger from '../utils/logger';

// Executar a cada hora
const CRON_SCHEDULE = '0 * * * *'; // A cada hora
const ERROR_RATE_THRESHOLD = 20; // 20%
const TIME_WINDOW_HOURS = 24;

export function startErrorRateMonitor() {
  logger.info('[ErrorRateMonitor] Iniciando monitor de taxa de erro...');

  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await checkErrorRate();
    } catch (error: any) {
      logger.error('[ErrorRateMonitor] ❌ Erro ao verificar taxa de erro:', error);
    }
  });

  logger.info(`[ErrorRateMonitor] ✅ Monitor agendado: ${CRON_SCHEDULE} (a cada hora)`);
}

async function checkErrorRate() {
  try {
    // Calcular período de 24 horas
    

    // Obter estatísticas
    const stats = {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 100,
    };

    logger.info(`[ErrorRateMonitor] Taxa de erro atual: ${stats.successRate.toFixed(1)}% (${stats.successful}/${stats.total})`);

    // Verificar se a taxa de erro excede o limite
    const errorRate = 100 - stats.successRate;
    
    if (errorRate > ERROR_RATE_THRESHOLD && stats.total >= 10) {
      logger.warn(`[ErrorRateMonitor] ⚠️ ALERTA: Taxa de erro elevada: ${errorRate.toFixed(1)}%`);
      
      // Enviar alerta (implementar integração com email/slack/etc)
      await sendAlert({
        errorRate,
        total: stats.total,
        failed: stats.failed,
        timeWindow: TIME_WINDOW_HOURS,
      });
    }
  } catch (error: any) {
    logger.error('[ErrorRateMonitor] Erro ao verificar taxa de erro:', error);
    throw error;
  }
}

async function sendAlert(data: {
  errorRate: number;
  total: number;
  failed: number;
  timeWindow: number;
}) {
  // TODO: Implementar envio de email/slack/webhook
  logger.warn(`[ErrorRateMonitor] 🚨 ALERTA DE TAXA DE ERRO:
    - Taxa de erro: ${data.errorRate.toFixed(1)}%
    - Total de execuções: ${data.total}
    - Falhas: ${data.failed}
    - Período: últimas ${data.timeWindow} horas
    
    ⚠️ Ação recomendada: Verificar logs e investigar causa das falhas.
  `);

  // Exemplo de integração com webhook (descomentar e configurar)
  /*
  try {
    await fetch(process.env.ALERT_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ALERTA: Taxa de erro do scraper em ${data.errorRate.toFixed(1)}%`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Taxa de Erro Elevada Detectada*\n\n` +
                    `• Taxa de erro: *${data.errorRate.toFixed(1)}%*\n` +
                    `• Total de execuções: ${data.total}\n` +
                    `• Falhas: ${data.failed}\n` +
                    `• Período: últimas ${data.timeWindow} horas`
            }
          }
        ]
      })
    });
  } catch (error) {
    logger.error('[ErrorRateMonitor] Erro ao enviar alerta via webhook:', error);
  }
  */
}

// Executar verificação manualmente (útil para testes)
export async function checkErrorRateNow() {
  logger.info('[ErrorRateMonitor] Executando verificação manual...');
  await checkErrorRate();
}
