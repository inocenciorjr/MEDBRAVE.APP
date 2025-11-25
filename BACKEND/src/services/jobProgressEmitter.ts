import { EventEmitter } from 'events';

export interface JobProgressEvent {
  jobId: string;
  type: 'extraction' | 'categorization' | 'rewrite' | 'draft' | 'complete' | 'error';
  step: string;
  message: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  timestamp: Date;
}

class JobProgressEmitter extends EventEmitter {
  private static instance: JobProgressEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100); // Permitir múltiplas conexões SSE
  }

  static getInstance(): JobProgressEmitter {
    if (!JobProgressEmitter.instance) {
      JobProgressEmitter.instance = new JobProgressEmitter();
    }
    return JobProgressEmitter.instance;
  }

  emitProgress(event: JobProgressEvent) {
    this.emit(`job:${event.jobId}`, event);
    this.emit('job:all', event); // Para monitorar todos os jobs
  }

  emitExtraction(jobId: string, step: string, message: string, current?: number, total?: number) {
    this.emitProgress({
      jobId,
      type: 'extraction',
      step,
      message,
      progress: current !== undefined && total !== undefined ? {
        current,
        total,
        percentage: Math.round((current / total) * 100),
      } : undefined,
      timestamp: new Date(),
    });
  }

  emitCategorization(jobId: string, step: string, message: string, current?: number, total?: number) {
    this.emitProgress({
      jobId,
      type: 'categorization',
      step,
      message,
      progress: current !== undefined && total !== undefined ? {
        current,
        total,
        percentage: Math.round((current / total) * 100),
      } : undefined,
      timestamp: new Date(),
    });
  }

  emitRewrite(jobId: string, step: string, message: string, current?: number, total?: number) {
    this.emitProgress({
      jobId,
      type: 'rewrite',
      step,
      message,
      progress: current !== undefined && total !== undefined ? {
        current,
        total,
        percentage: Math.round((current / total) * 100),
      } : undefined,
      timestamp: new Date(),
    });
  }

  emitDraft(jobId: string, message: string) {
    this.emitProgress({
      jobId,
      type: 'draft',
      step: 'draft',
      message,
      timestamp: new Date(),
    });
  }

  emitComplete(jobId: string, message: string) {
    this.emitProgress({
      jobId,
      type: 'complete',
      step: 'complete',
      message,
      timestamp: new Date(),
    });
  }

  emitError(jobId: string, message: string) {
    this.emitProgress({
      jobId,
      type: 'error',
      step: 'error',
      message,
      timestamp: new Date(),
    });
  }
}

export const jobProgressEmitter = JobProgressEmitter.getInstance();
