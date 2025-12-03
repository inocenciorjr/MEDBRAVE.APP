import { Queue, Worker, Job } from 'bullmq';
import { redisForQueue } from '../../../lib/redis';
import { menteeFinancialService } from '../services/MenteeFinancialService';

interface ExpirationJobData {
  type: 'process_expirations' | 'process_reminders';
  timestamp: Date;
}

interface ExpirationJobResult {
  expired?: number;
  notified?: number;
  remindersProcessed?: number;
}

export class MenteeExpirationJobService {
  private queue: Queue<ExpirationJobData>;
  private worker: Worker<ExpirationJobData, ExpirationJobResult>;

  constructor() {
    // Inicializar fila
    this.queue = new Queue<ExpirationJobData>('mentee-expiration', {
      connection: redisForQueue,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 100 }, // 24h
        removeOnFail: { age: 7 * 24 * 60 * 60 }, // 7 dias
      },
    });

    // Inicializar worker
    this.worker = new Worker<ExpirationJobData, ExpirationJobResult>(
      'mentee-expiration',
      async (job) => this.processJob(job),
      {
        connection: redisForQueue,
        concurrency: 1,
        autorun: false,
      }
    );

    this.setupEventListeners();
    this.scheduleRecurringJobs();
  }

  private setupEventListeners() {
    this.worker.on('completed', (job, result) => {
      console.log(`✅ [MenteeExpiration] Job ${job.id} completed:`, result);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`❌ [MenteeExpiration] Job ${job?.id} failed:`, error);
    });
  }

  /**
   * Agendar jobs recorrentes
   */
  private async scheduleRecurringJobs() {
    try {
      // Remover jobs repetidos existentes
      const repeatableJobs = await this.queue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.queue.removeRepeatableByKey(job.key);
      }

      // Job de expiração - roda a cada hora
      await this.queue.add(
        'process-expirations',
        { type: 'process_expirations', timestamp: new Date() },
        {
          repeat: { pattern: '0 * * * *' }, // A cada hora
          jobId: 'recurring-expirations',
        }
      );

      // Job de lembretes - roda todo dia às 8h
      await this.queue.add(
        'process-reminders',
        { type: 'process_reminders', timestamp: new Date() },
        {
          repeat: { pattern: '0 8 * * *' }, // Todo dia às 8h
          jobId: 'recurring-reminders',
        }
      );

      console.log('✅ [MenteeExpiration] Jobs recorrentes agendados');
    } catch (error) {
      console.error('❌ [MenteeExpiration] Erro ao agendar jobs:', error);
    }
  }

  /**
   * Processar job
   */
  private async processJob(job: Job<ExpirationJobData>): Promise<ExpirationJobResult> {
    console.log(`🔄 [MenteeExpiration] Processando job ${job.id} - ${job.data.type}`);

    switch (job.data.type) {
      case 'process_expirations':
        return await this.processExpirations();
      case 'process_reminders':
        return await this.processReminders();
      default:
        throw new Error(`Tipo de job desconhecido: ${job.data.type}`);
    }
  }

  /**
   * Processar expirações de mentorados
   */
  private async processExpirations(): Promise<ExpirationJobResult> {
    try {
      const result = await menteeFinancialService.processExpirations();
      console.log(`✅ [MenteeExpiration] ${result.expired} mentorados expirados`);
      return result;
    } catch (error) {
      console.error('❌ [MenteeExpiration] Erro ao processar expirações:', error);
      throw error;
    }
  }

  /**
   * Processar lembretes do dia
   */
  private async processReminders(): Promise<ExpirationJobResult> {
    // Este job pode ser expandido para enviar notificações
    // Por enquanto, apenas marca lembretes vencidos como OVERDUE
    try {
      const result = await menteeFinancialService.processExpirations();
      console.log(`✅ [MenteeExpiration] Lembretes processados`);
      return { remindersProcessed: result.notified };
    } catch (error) {
      console.error('❌ [MenteeExpiration] Erro ao processar lembretes:', error);
      throw error;
    }
  }

  /**
   * Iniciar worker
   */
  async start() {
    await this.worker.run();
    console.log('🚀 [MenteeExpiration] Worker iniciado');
  }

  /**
   * Parar worker
   */
  async stop() {
    await this.worker.close();
    await this.queue.close();
    console.log('🛑 [MenteeExpiration] Worker parado');
  }

  /**
   * Executar processamento manual (para testes)
   */
  async runManual(type: 'process_expirations' | 'process_reminders') {
    const job = await this.queue.add(
      `manual-${type}`,
      { type, timestamp: new Date() },
      { jobId: `manual-${type}-${Date.now()}` }
    );
    return job.id;
  }
}

export const menteeExpirationJob = new MenteeExpirationJobService();
export default menteeExpirationJob;
