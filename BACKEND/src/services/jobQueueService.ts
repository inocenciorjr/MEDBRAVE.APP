import { Queue, Worker, Job } from 'bullmq';
import { redisForQueue } from '../lib/redis';
import scraperService from './scraperService';

// Interfaces
export interface UrlConfig {
  saveAsOfficial: boolean;
  officialExamData?: {
    examName: string;
    examYear: number;
    examEdition?: string;
    institution?: string;
    examType: 'revalida' | 'enare' | 'residencia' | 'concurso' | 'outro';
    title: string;
    description?: string;
    instructions?: string;
    applicationDate?: string;
    timeLimitMinutes?: number;
    passingScore?: number;
    tags?: string[];
  };
}

export interface BatchResult {
  url: string;
  status: 'success' | 'failed';
  questionsExtracted?: number;
  questionsSaved?: number;
  missingQuestions?: number[];
  error?: string;
  officialExamId?: string;
  draftId?: string;
  duration: number;
}

export interface BatchJobData {
  jobId: string;
  userId: string;
  urls: string[];
  configs: Record<string, UrlConfig>;
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results: BatchResult[];
  missingQuestions: Record<string, number[]>;
  options?: {
    delayBetweenUrls?: number;
    maxRetries?: number;
  };
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
  currentUrl?: string;
  results: BatchResult[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

export interface JobFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
}

export class JobQueueService {
  private queue: Queue<BatchJobData>;
  private worker: Worker<BatchJobData>;
  private extractionLock: boolean = false; // Lock para garantir 1 extração por vez
  private extractionQueue: Array<{ jobId: string; resolve: () => void }> = []; // Fila de espera

  constructor() {
    // Initialize BullMQ Queue
    this.queue = new Queue<BatchJobData>('scraper-batch', {
      connection: redisForQueue,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 7 * 24 * 60 * 60, // 7 days
          count: 100,
        },
        removeOnFail: {
          age: 30 * 24 * 60 * 60, // 30 days
        },
      },
    });

    // Initialize Worker
    this.worker = new Worker<BatchJobData>(
      'scraper-batch',
      async (job) => {
        return await this.processJob(job);
      },
      {
        connection: redisForQueue,
        concurrency: 4, // Process four jobs at a time (extração sequencial, mas 4 jobs completos simultâneos)
        autorun: false, // Don't start automatically
        lockDuration: 600000, // 10 minutes lock duration (increased from default 30s)
        stalledInterval: 300000, // Check for stalled jobs every 5 minutes (increased from default 30s)
        maxStalledCount: 2, // Allow job to stall twice before failing
      }
    );

    // Setup event listeners
    this.setupEventListeners();

    // Start worker manually based on mode
    const isWorkerMode = process.env.WORKER_MODE === 'true';
    const isCliMode = process.env.DISABLE_WORKER === 'true';

    if (isCliMode) {
      console.log(`[JobQueue] ⏸️  Worker disabled (CLI mode)`);
    } else if (isWorkerMode) {
      // Worker dedicado - sempre inicia
      this.worker.run().catch((error) => {
        console.error('❌ Worker failed to start:', error);
      });
      console.log(`[JobQueue] 🚀 Worker dedicado iniciado com concurrency: 4`);
    } else {
      // API Server - não inicia worker (será iniciado em processo separado)
      console.log(`[JobQueue] ⏸️  Worker desabilitado (use 'npm run worker' em terminal separado)`);
    }
  }

  private setupEventListeners() {
    this.worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, error) => {
      // Don't log cancellation errors as failures
      if ((error as any)?.isCancellation || error.message === 'Job was cancelled') {
        console.log(`⚠️ Job ${job?.id} cancelled`);
      } else {
        console.error(`❌ Job ${job?.id} failed:`, error);
      }
    });

    this.worker.on('error', (error) => {
      console.error('❌ Worker error:', error);
    });
  }

  /**
   * Creates a batch scraping job
   */
  async createBatchJob(
    urls: string[],
    configs: Record<string, UrlConfig>,
    userId: string,
    options?: { delayBetweenUrls?: number; maxRetries?: number }
  ): Promise<string> {
    // Validate URLs (skip validation for source:// protocol)
    for (const url of urls) {
      if (!url.startsWith('source://')) {
        const validation = await scraperService.validateUrl(url);
        if (!validation.valid) {
          throw new Error(`Invalid URL ${url}: ${validation.error}`);
        }
      }
    }

    // Create job data
    const jobData: BatchJobData = {
      jobId: '', // Will be set by BullMQ
      userId,
      urls,
      configs,
      createdAt: new Date(),
      status: 'pending',
      progress: {
        total: urls.length,
        completed: 0,
        failed: 0,
      },
      results: [],
      missingQuestions: {},
      options: {
        delayBetweenUrls: options?.delayBetweenUrls || 2000,
        maxRetries: options?.maxRetries || 3,
      },
    };

    // Add job to queue
    const job = await this.queue.add('batch-scrape', jobData, {
      jobId: `batch-${Date.now()}-${userId}`,
    });

    console.log(`[JobQueue] ✅ Job ${job.id} added to queue`);

    // Log queue status
    // Silencioso - não loga para evitar poluição

    return job.id!;
  }

  /**
   * Aguarda permissão para extrair (apenas 1 extração por vez)
   */
  private async acquireExtractionLock(jobId: string): Promise<void> {
    console.log(`\n🔒 [JobQueue] Job ${jobId} requesting extraction lock...`);
    console.log(`📊 Current state: Lock=${this.extractionLock}, Queue=${this.extractionQueue.length} jobs waiting`);

    if (!this.extractionLock) {
      // Lock disponível, adquire imediatamente
      this.extractionLock = true;
      console.log(`✅ [JobQueue] Job ${jobId} acquired extraction lock IMMEDIATELY`);
      console.log(`🚀 [JobQueue] Job ${jobId} can now start extraction\n`);
      return;
    }

    // Lock ocupado, entra na fila de espera
    console.log(`⏳ [JobQueue] Job ${jobId} WAITING for extraction lock (added to queue)`);
    console.log(`📋 Queue position: ${this.extractionQueue.length + 1}\n`);
    return new Promise<void>((resolve) => {
      this.extractionQueue.push({ jobId, resolve });
    });
  }

  /**
   * Libera o lock de extração e permite próximo job extrair
   */
  private releaseExtractionLock(jobId: string): void {
    console.log(`[JobQueue] Job ${jobId} releasing extraction lock`);
    console.log(`[JobQueue] 📊 Extraction queue length: ${this.extractionQueue.length}`);

    if (this.extractionQueue.length > 0) {
      // Há jobs esperando, libera o próximo
      const next = this.extractionQueue.shift();
      if (next) {
        console.log(`[JobQueue] 🔓 Extraction lock passed to job ${next.jobId}`);
        // Lock continua true, apenas passa para o próximo
        next.resolve();
      }
    } else {
      // Nenhum job esperando, libera o lock
      this.extractionLock = false;
      console.log(`[JobQueue] 🔓 Extraction lock released (no jobs waiting)`);
    }
  }

  /**
   * Processes a batch job
   */
  private async processJob(job: Job<BatchJobData>): Promise<void> {
    console.log(`[JobQueue] 🚀 Job ${job.id} STARTED (concurrency allows 4 jobs)`);

    // Import progress emitter
    const { jobProgressEmitter } = await import('./jobProgressEmitter');
    jobProgressEmitter.emitExtraction(job.id!, 'started', 'Job iniciado');

    const { urls, options } = job.data;
    const results: BatchResult[] = [];
    const missingQuestions: Record<string, number[]> = {};

    // Update status to processing
    await job.updateData({
      ...job.data,
      status: 'processing',
    });

    // Import services
    const { draftService } = await import('./draftService');

    // Process each URL sequentially
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      // const config = configs[url]; // TODO: Use config for per-URL settings
      const startTime = Date.now();

      try {
        // ⏳ AGUARDA PERMISSÃO PARA EXTRAIR (apenas 1 extração por vez)
        const { jobProgressEmitter } = await import('./jobProgressEmitter');
        jobProgressEmitter.emitExtraction(job.id!, 'waiting', 'Aguardando permissão para extrair...');

        // Update progress to show waiting state
        await job.updateProgress({
          current: i,
          total: urls.length,
          currentUrl: `⏳ Aguardando extração: ${url}`,
        });

        await this.acquireExtractionLock(job.id!);
        jobProgressEmitter.emitExtraction(job.id!, 'extracting', `Extraindo questões de ${url}...`);

        // Update progress to show extracting state
        await job.updateProgress({
          current: i,
          total: urls.length,
          currentUrl: `🔄 Extraindo: ${url}`,
        });
        // Check if job was cancelled or moved to failed
        const freshJob = await this.queue.getJob(job.id!);
        if (!freshJob) {
          console.log(`[JobQueue] Job ${job.id} was removed, stopping processing`);
          throw new Error('Job was cancelled');
        }

        const currentState = await freshJob.getState();
        const currentData = freshJob.data;

        if (currentData.status === 'cancelled' || currentState === 'failed') {
          console.log(`[JobQueue] Job ${job.id} was cancelled (status: ${currentData.status}, state: ${currentState}), stopping processing`);
          throw new Error('Job was cancelled');
        }

        // Update progress and extend lock to prevent stalling
        await job.updateProgress({
          current: i + 1,
          total: urls.length,
          currentUrl: url,
        });

        // Extend lock to prevent job from being marked as stalled
        await job.extendLock(job.token!, 600000); // Extend lock by 10 minutes

        // Step 1: Extract questions using existing method
        console.log(`[JobQueue] Extracting from ${url}...`);

        // Setup heartbeat to prevent stalling during long extraction
        let isCancelled = false;
        const heartbeatInterval = setInterval(async () => {
          try {
            // Check if job was cancelled during heartbeat
            const freshJob = await this.queue.getJob(job.id!);
            if (!freshJob || freshJob.data.status === 'cancelled') {
              console.log(`[JobQueue] ⚠️ Job ${job.id} cancelled, stopping heartbeat`);
              isCancelled = true;
              clearInterval(heartbeatInterval);
              return;
            }

            await job.extendLock(job.token!, 600000);
            console.log(`[JobQueue] Heartbeat: Lock extended for job ${job.id}`);
          } catch (error) {
            console.error(`[JobQueue] Failed to extend lock:`, error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Every 30 seconds (more frequent checks)

        // Declare variables outside try block for access later
        let extractionResult: any;
        let bulkQuestions: any[] = [];
        let missing: number[] = [];
        let draftId: string | undefined = undefined;
        let outputFilePath: string | undefined;
        let examName: string = `Prova - ${url}`; // ✅ Declarar no topo para usar depois

        try {
          // Check if already cancelled before starting extraction
          if (isCancelled) {
            clearInterval(heartbeatInterval);
            const cancelError = new Error('Job was cancelled before extraction started');
            (cancelError as any).isCancellation = true;
            throw cancelError;
          }

          // Check if this is an exam source (alternative scraper)
          if (url.startsWith('source://')) {
            const sourceIndex = url.replace('source://', '');
            console.log(`[JobQueue] Extracting from exam source index: ${sourceIndex}`);

            // Load provas list to get exam name
            const fs = require('fs');
            const path = require('path');
            examName = `Prova - source://${sourceIndex}`; // ✅ Atualizar variável externa

            try {
              const provasListPath = path.join(process.cwd(), 'output', 'hardworq', 'provas-list.json');
              const provasList = JSON.parse(fs.readFileSync(provasListPath, 'utf-8'));
              const prova = provasList.find((p: any) => p.value === sourceIndex);
              if (prova) {
                examName = prova.label;
                console.log(`[JobQueue] Exam name: ${examName}`);
              }
            } catch (error) {
              console.warn(`[JobQueue] Could not load provas list, using default name`);
            }

            // Execute Hardworq CLI scraper with REAL-TIME output capture
            const { spawn } = require('child_process');
            const { jobProgressEmitter } = await import('./jobProgressEmitter'); // ✅ Import emitter

            const email = process.env.SCRAPER_EMAIL || 'videosupe2017.1@gmail.com';
            const password = process.env.SCRAPER_PASSWORD || 'eudapromaq123';

            console.log(`[JobQueue] Executing CLI with real-time capture`);

            // Spawn process to capture output in real-time
            const cliProcess = spawn('npm', [
              'run',
              'scrape:hardworq',
              '--',
              '-e',
              email,
              '-p',
              password,
              '--prova-index',
              (parseInt(sourceIndex) + 1).toString(),
              '--limit',
              '0' // ✅ 0 = SEM LIMITE, extrai todas as questões
            ], {
              cwd: process.cwd(),
              shell: true,
            });

            let stdout = '';
            let stderr = '';

            // Capture stdout in real-time and emit events
            cliProcess.stdout.on('data', (data: Buffer) => {
              const text = data.toString();
              stdout += text;

              // Parse each line and emit events
              const lines = text.split('\n');
              for (const line of lines) {
                if (!line.trim()) continue;

                // Emit event for each significant log line
                if (line.includes('[info]')) {
                  const message = line.replace(/.*\[info\]\s*/, '').trim();
                  if (message) {
                    jobProgressEmitter.emitExtraction(job.id!, 'extracting', message);
                  }
                }
              }
            });

            cliProcess.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });

            // Capture stderr for error details
            let stderrOutput = '';
            cliProcess.stderr?.on('data', (data: Buffer) => {
              const text = data.toString();
              stderrOutput += text;
              console.error(`[JobQueue] CLI stderr:`, text);
            });

            // Wait for process to complete
            try {
              await new Promise((resolve, reject) => {
                cliProcess.on('close', (code: number) => {
                  if (code === 0) {
                    resolve(code);
                  } else {
                    const errorMsg = stderrOutput || `CLI exited with code ${code}`;
                    reject(new Error(errorMsg));
                  }
                });

                cliProcess.on('error', (error: Error) => {
                  reject(error);
                });

                // Timeout after 10 minutes
                setTimeout(() => {
                  cliProcess.kill();
                  reject(new Error('CLI timeout after 10 minutes'));
                }, 600000);
              });

              console.log(`[JobQueue] CLI completed successfully`);
              if (stderr) console.error(`[JobQueue] CLI stderr:`, stderr);

              // Find the output file path from CLI output
              const outputMatch = stdout.match(/Output file: (.+\.json)/);
              if (!outputMatch) {
                throw new Error('Could not find output file in CLI output');
              }

              const outputFile = outputMatch[1];
              outputFilePath = outputFile; // ✅ Salvar para cleanup posterior
              console.log(`[JobQueue] Reading questions from: ${outputFile}`);

              // Read the generated JSON file
              const questionsData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));

              // Get real exam name from extracted data (prova_codigo from first question)
              let realExamName = examName; // Fallback to dropdown name
              if (questionsData.length > 0 && questionsData[0].metadata) {
                const firstQuestion = questionsData[0];
                const provaCodigo = firstQuestion.metadata.prova_codigo;
                const source = firstQuestion.source;
                const year = firstQuestion.year;

                if (provaCodigo) {
                  realExamName = `${provaCodigo} (${source} ${year})`;
                  console.log(`[JobQueue] Real exam name from extraction: ${realExamName}`);
                }
              }

              // Extract year from first question
              const examYear = questionsData.length > 0 ? questionsData[0].year : new Date().getFullYear();

              // Extract metadata from first question for AI context
              const firstQuestion = questionsData[0];
              const examSource = firstQuestion?.source || 'Desconhecido';
              const examProvaCodigo = firstQuestion?.metadata?.prova_codigo;

              // Format as extraction result
              extractionResult = {
                questions: questionsData,
                metadata: {
                  source: 'alternative',
                  sourceIndex: sourceIndex,
                  examName: realExamName,
                  examYear: examYear,
                  totalQuestions: questionsData.length,
                  extractionTime: 0,
                  // ✅ Metadados para IA citar a prova
                  examSource: examSource, // Ex: "ENARE/ENAMED", "INEP"
                  examProvaCodigo: examProvaCodigo, // Ex: "ENAREENAMED2021R1"
                },
                stats: {
                  questionsExtracted: questionsData.length,
                  questionsWithAnswers: questionsData.filter((q: any) => q.correct_alternative_id).length,
                  imagesFound: questionsData.filter((q: any) => q.image_urls && q.image_urls.length > 0).length,
                },
              };

              console.log(`[JobQueue] Successfully extracted ${questionsData.length} questions from exam source`);

            } catch (cliError: any) {
              console.error(`[JobQueue] CLI execution failed:`, cliError);
              throw new Error(`Failed to execute scraper CLI: ${cliError.message}`);
            }

          } else {
            // Regular URL extraction
            extractionResult = await scraperService.extractFromUrlWithProgress(
              url,
              {
                timeout: 300,
                downloadImages: true,
              },
              async (progress) => {
                console.log(`[JobQueue] Extraction progress: ${progress.status}`);

                // Check cancellation flag first (faster)
                if (isCancelled) {
                  console.log(`[JobQueue] ⚠️ Job cancelled (flag), aborting extraction...`);
                  clearInterval(heartbeatInterval);
                  const cancelError = new Error('Job was cancelled');
                  (cancelError as any).isCancellation = true;
                  throw cancelError;
                }

                // Check cancellation in database (slower but authoritative)
                const checkJob = await this.queue.getJob(job.id!);
                if (!checkJob || checkJob.data.status === 'cancelled' || await checkJob.getState() === 'failed') {
                  console.log(`[JobQueue] ⚠️ Job cancelled (database), aborting extraction...`);
                  isCancelled = true;
                  clearInterval(heartbeatInterval);
                  const cancelError = new Error('Job was cancelled');
                  (cancelError as any).isCancellation = true;
                  throw cancelError;
                }
              }
            );
          }

          clearInterval(heartbeatInterval);

          // Check if cancelled during extraction (after it completes)
          if (isCancelled) {
            const cancelError = new Error('Job was cancelled during extraction');
            (cancelError as any).isCancellation = true;
            throw cancelError;
          }

          // Convert to bulk format - EXACTLY like manual does (page.tsx linha 760-780)
          const questions = extractionResult.questions;
          console.log(`📊 Total de questões extraídas: ${questions.length}`);

          bulkQuestions = questions.map((q: any, index: number) => ({
            numero: q.numero || `Q${index + 1}`,
            enunciado: q.statement || q.enunciado || '',
            alternativas: q.alternatives?.map((alt: any) => alt.text) || q.alternativas || [],
            correta: q.alternatives ? q.alternatives.findIndex((alt: any) => alt.isCorrect) : q.correta,
            dificuldade: q.difficulty || q.dificuldade || 'Média',
            tags: [...(q.tags || []), 'scraper'],
            filterIds: q.filter_ids || q.filterIds || [],
            subFilterIds: q.sub_filter_ids || q.subFilterIds || [],
            explicacao: q.explanation || q.explicacao || '',
            professorComment: q.metadata?.professor_comment || q.professor_comment || '',
            imagem: q.imagem || (q.image_urls && q.image_urls.length > 0 ? q.image_urls[0] : undefined),
            tempId: `temp-scraper-${Date.now()}-${index}`,
            aiGenerated: false,
            isAnnulled: q.is_annulled || false,
            isOutdated: false,
            status: 'Publicada',
          }));

          console.log(`[JobQueue] Extracted ${bulkQuestions.length} questions`);

          // Check cancellation AFTER extraction
          const checkAfterExtraction = await this.queue.getJob(job.id!);
          if (!checkAfterExtraction || checkAfterExtraction.data.status === 'cancelled') {
            console.log(`[JobQueue] ⚠️ Job cancelled after extraction, skipping categorization`);
            // 🔓 LIBERA LOCK antes de sair
            this.releaseExtractionLock(job.id!);
            const cancelError = new Error('Job was cancelled');
            (cancelError as any).isCancellation = true;
            throw cancelError;
          }

          // 🔓 LIBERA LOCK DE EXTRAÇÃO (próximo job pode começar a extrair)
          this.releaseExtractionLock(job.id!);
          console.log(`[JobQueue] ✅ Extraction completed for job ${job.id}, lock released.`);
          console.log(`[JobQueue] 📊 Current state: ${this.extractionQueue.length} jobs waiting for extraction lock`);
          console.log(`[JobQueue] 🔄 Job ${job.id} continuing with categorization + rewrite...`);

          const { jobProgressEmitter: progressEmitter } = await import('./jobProgressEmitter');
          progressEmitter.emitExtraction(job.id!, 'completed', `✅ ${bulkQuestions.length} questões extraídas`);
          progressEmitter.emitCategorization(job.id!, 'starting', 'Iniciando categorização e reescrita...');

          // Step 2: Categorize AND Rewrite comments in PARALLEL
          let categorizationResults: any[] = [];
          let rewriteResults: any[] = [];

          try {
            console.log(`[JobQueue] Starting categorization + comment rewrite in parallel for ${bulkQuestions.length} questions...`);

            // Import services
            const { createBatchProcessor } = await import('./batchProcessor');
            const { createCategorizationService } = await import('./categorizationService');
            const { createFilterHierarchyManager } = await import('./filterHierarchyManager');
            const { createCommentRewriteService } = await import('./commentRewriteService');
            const { createCommentRewriteBatchProcessor } = await import('./commentRewriteBatchProcessor');
            const { createOpenRouterClient } = await import('./openRouterClient');
            const { createGeminiClient } = await import('./geminiClient');
            const { createMinimaxClient } = await import('./minimaxClient');
            const { createGptOssClient } = await import('./gptOssClient');
            const { createQwenClient } = await import('./qwenClient');
            const { createGLMClient } = await import('./glmClient');

            const supabaseUrl = process.env.SUPABASE_URL || '';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            const useGemini = process.env.USE_GEMINI === 'true';
            const useMinimax = process.env.USE_MINIMAX === 'true';
            const useGptOss = process.env.USE_GPT_OSS === 'true';
            const useQwen = process.env.USE_QWEN === 'true';
            const useGLM = process.env.USE_GLM === 'true';

            // Setup AI clients - DIFERENTES para categorização e reescrita
            // Isso permite usar 2 API keys diferentes em paralelo sem competir por rate limit

            let categorizationClient: any;
            let rewriteClient: any;

            if (useGLM) {
              const glmApiKey1 = process.env.GLM_API_KEY || '';
              const glmApiKey2 = process.env.GLM_API_KEY_2 || glmApiKey1; // Fallback para mesma key
              console.log('⚡ Using GLM-4.6 for AI processing (200K context, fast reasoning!)');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${glmApiKey2 !== glmApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createGLMClient(glmApiKey1);
              rewriteClient = createGLMClient(glmApiKey2);
            } else if (useQwen) {
              const qwenApiKey1 = process.env.QWEN_API_KEY || '';
              const qwenApiKey2 = process.env.QWEN_API_KEY_2 || qwenApiKey1;
              console.log('🚀 Using Qwen3-235B-A22B for AI processing (235B params, 22B active, 32k-131k context!)');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${qwenApiKey2 !== qwenApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createQwenClient(qwenApiKey1);
              rewriteClient = createQwenClient(qwenApiKey2);
            } else if (useGptOss) {
              const gptOssApiKey1 = process.env.GPT_OSS_API_KEY || '';
              const gptOssApiKey2 = process.env.GPT_OSS_API_KEY_2 || gptOssApiKey1;
              console.log('🧠 Using GPT-OSS 120B for AI processing (high reasoning, 128k output!)');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${gptOssApiKey2 !== gptOssApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createGptOssClient(gptOssApiKey1);
              rewriteClient = createGptOssClient(gptOssApiKey2);
            } else if (useMinimax) {
              const minimaxApiKey1 = process.env.MINIMAX_API_KEY || '';
              const minimaxApiKey2 = process.env.MINIMAX_API_KEY_2 || minimaxApiKey1;
              console.log('🚀 Using MiniMax for AI processing (200k input, 128k output tokens!)');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${minimaxApiKey2 !== minimaxApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createMinimaxClient(minimaxApiKey1);
              rewriteClient = createMinimaxClient(minimaxApiKey2);
            } else if (useGemini) {
              const geminiApiKey1 = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
              const geminiApiKey2 = process.env.GEMINI_API_KEY_2 || geminiApiKey1;
              console.log('💎 Using Gemini for AI processing');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${geminiApiKey2 !== geminiApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createGeminiClient(geminiApiKey1);
              rewriteClient = createGeminiClient(geminiApiKey2);
            } else {
              const openRouterApiKey1 = process.env.OPENROUTER_API_KEY || '';
              const openRouterApiKey2 = process.env.OPENROUTER_API_KEY_2 || openRouterApiKey1;
              console.log('🌐 Using OpenRouter for AI processing');
              console.log(`🔑 Categorization: Key 1, Rewrite: Key ${openRouterApiKey2 !== openRouterApiKey1 ? '2' : '1 (same)'}`);
              categorizationClient = createOpenRouterClient(openRouterApiKey1);
              rewriteClient = createOpenRouterClient(openRouterApiKey2);
            }

            // Create services - usando clients DIFERENTES
            const filterHierarchyManager = createFilterHierarchyManager(supabaseUrl, supabaseKey);
            const categorizationService = createCategorizationService(supabaseUrl, supabaseKey, categorizationClient, filterHierarchyManager);
            const batchProcessor = createBatchProcessor(categorizationService);

            const commentRewriteService = createCommentRewriteService(rewriteClient); // ✅ Client diferente!
            const rewriteBatchProcessor = createCommentRewriteBatchProcessor(commentRewriteService);

            // Load hierarchy BEFORE processing
            console.log('🔄 Loading filter hierarchy...');
            await filterHierarchyManager.loadHierarchy(true);
            console.log('✅ Filter hierarchy loaded');

            // Format questions for categorization
            const formattedQuestions = bulkQuestions.map((q: any) => ({
              id: q.tempId || q.id || '',
              numero: q.numero || '',
              enunciado: q.enunciado || '',
              alternativas: q.alternativas || [],
              correta: q.correta,
              imagem: q.imagem,
              tempId: q.tempId,
            }));

            // Format questions for rewrite
            const questionsForRewrite = bulkQuestions.map((q: any) => ({
              id: q.tempId || q.id || '',
              numero: q.numero || '',
              enunciado: q.enunciado || '',
              alternativas: q.alternativas || [],
              correta: q.correta,
              imagem: q.imagem,
              professorComment: q.professorComment,
              tempId: q.tempId,
            }));

            // 🔄 PARALELO: Categorização e reescrita ao mesmo tempo
            console.log('🔄 Starting categorization + rewrite in PARALLEL...');

            [categorizationResults, rewriteResults] = await Promise.all([
              // Categorização
              batchProcessor.processBatches(
                formattedQuestions,
                {
                  batchSize: 5,
                  includeExplanations: true,
                  confidenceThreshold: 60,
                  jobId: job.id!,
                },
                (progress: any) => {
                  console.log(`[JobQueue] Categorization progress: ${progress.percentage}%`);
                }
              ),
              // Reescrita (em paralelo)
              rewriteBatchProcessor.processBatches(
                questionsForRewrite,
                {
                  batchSize: 5,
                  includeExplanations: true,
                  jobId: job.id!,
                  // ✅ Passar metadados da prova para IA poder citar
                  examMetadata: {
                    source: extractionResult?.metadata?.examSource,
                    year: extractionResult?.metadata?.examYear,
                    provaCodigo: extractionResult?.metadata?.examProvaCodigo,
                    examName: extractionResult?.metadata?.examName,
                  },
                },
                (progress: any) => {
                  console.log(`[JobQueue] Rewrite progress: ${progress.percentage}%`);
                }
              )
            ]);

            console.log(`[JobQueue] ✅ Categorized ${categorizationResults.length} questions`);
            console.log(`[JobQueue] ✅ Rewritten ${rewriteResults.filter(r => r.rewrittenComment).length}/${rewriteResults.length} comments`);

            const { jobProgressEmitter: emitter } = await import('./jobProgressEmitter');
            emitter.emitCategorization(job.id!, 'completed', `✅ ${categorizationResults.length} questões categorizadas`);
            emitter.emitRewrite(job.id!, 'completed', `✅ ${rewriteResults.filter(r => r.rewrittenComment).length}/${rewriteResults.length} comentários reescritos`);

          } catch (error) {
            console.error(`[JobQueue] Error in categorization/rewrite:`, error);
            // Continue without categorization/rewrite
          }

          // Check cancellation AFTER categorization
          const checkAfterCategorization = await this.queue.getJob(job.id!);
          if (!checkAfterCategorization || checkAfterCategorization.data.status === 'cancelled') {
            console.log(`[JobQueue] ⚠️ Job cancelled after categorization, skipping draft creation`);
            const cancelError = new Error('Job was cancelled');
            (cancelError as any).isCancellation = true;
            throw cancelError;
          }

          // Step 3: Apply categorization AND rewrite results to questions
          let questionsWithFilters = bulkQuestions;

          // Apply categorization
          if (categorizationResults.length > 0) {
            console.log(`[JobQueue] Applying categorization to ${categorizationResults.length} questions`);

            const catResultsMap = new Map();
            categorizationResults.forEach((result: any) => {
              if (result.questionId) {
                catResultsMap.set(result.questionId, result);
              }
            });

            questionsWithFilters = bulkQuestions.map((q: any) => {
              const result = catResultsMap.get(q.tempId) || catResultsMap.get(q.id);

              if (result) {
                const filterIds = result.suggestedFilters?.map((f: any) => f.filterId) || [];
                const subFilterIds = result.suggestedSubfilters?.map((sf: any) => sf.subfilterId) || [];

                return {
                  ...q,
                  filterIds,
                  subFilterIds,
                };
              }

              return q;
            });

            const categorizedCount = questionsWithFilters.filter((q: any) => q.filterIds && q.filterIds.length > 0).length;
            console.log(`[JobQueue] ✅ Categorization applied: ${categorizedCount}/${questionsWithFilters.length} questions have filters`);
          }

          // Apply rewrite results
          if (rewriteResults.length > 0) {
            console.log(`[JobQueue] Applying rewritten comments to questions`);
            console.log(`[JobQueue] Rewrite results received: ${rewriteResults.length}`);

            const rewriteResultsMap = new Map();
            rewriteResults.forEach((result: any) => {
              // Silencioso - não loga para evitar poluição
              if (result.questionId && result.rewrittenComment) {
                rewriteResultsMap.set(result.questionId, result.rewrittenComment);
              }
            });

            console.log(`[JobQueue] Rewrite map size: ${rewriteResultsMap.size}`);

            questionsWithFilters = questionsWithFilters.map((q: any) => {
              const rewrittenComment = rewriteResultsMap.get(q.tempId) || rewriteResultsMap.get(q.id);

              if (rewrittenComment) {
                // Silencioso - não loga para evitar poluição
                return {
                  ...q,
                  professorComment: rewrittenComment, // Substituir comentário original
                };
              }

              return q;
            });

            const rewrittenCount = questionsWithFilters.filter((q: any) =>
              rewriteResultsMap.has(q.tempId) || rewriteResultsMap.has(q.id)
            ).length;
            console.log(`[JobQueue] ✅ Comments rewritten: ${rewrittenCount}/${questionsWithFilters.length} questions`);

            // ✅ VALIDAÇÃO FINAL: Verificar se os comentários foram APLICADOS às questões
            const questionsWithAppliedComments = questionsWithFilters.filter((q: any) =>
              q.professorComment && q.professorComment.trim().length > 0
            ).length;
            console.log(`[JobQueue] 📝 Questions with comments applied: ${questionsWithAppliedComments}/${questionsWithFilters.length}`);

            if (questionsWithAppliedComments === 0 && rewriteResults.length > 0) {
              console.error(`❌ ERRO CRÍTICO: Nenhum comentário foi aplicado às questões!`);
              console.error(`Rewrite results:`, rewriteResults.map((r: any) => ({
                id: r.questionId,
                hasComment: !!r.rewrittenComment,
                error: r.error
              })));
            }
          }

          // Step 4: Process images and upload to R2
          let questionsWithR2Images = questionsWithFilters;
          try {
            console.log(`[JobQueue] 🖼️ Processing images for R2 upload...`);

            const { jobProgressEmitter: imageEmitter } = await import('./jobProgressEmitter');
            imageEmitter.emitExtraction(job.id!, 'processing_images', 'Processando imagens para R2...');

            // Gerar nome da pasta genérico (sem referência ao Hardworq)
            let examFolder = 'questions/images';

            if (url.startsWith('source://') && bulkQuestions.length > 0) {
              // Extrair informações da primeira questão
              const firstQuestion = extractionResult.questions[0];
              const source = firstQuestion.source || 'prova'; // ex: "ENARE/ENAMED"
              const year = firstQuestion.year || new Date().getFullYear();
              const provaCodigo = firstQuestion.metadata?.prova_codigo || '';

              // Extrair R1, R2, etc. do prova_codigo
              const rMatch = provaCodigo.match(/R(\d+)/i);
              const rNumber = rMatch ? `-r${rMatch[1]}` : '';

              // Normalizar source (ex: "ENARE/ENAMED" -> "enare-enamed")
              const normalizedSource = source
                .toLowerCase()
                .replace(/\//g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-');

              examFolder = `questions/${normalizedSource}-${year}${rNumber}`;
              console.log(`📁 Pasta da prova: ${examFolder}`);
            } else if (extractionResult?.metadata?.examName && extractionResult?.metadata?.examYear) {
              // Fallback para outros scrapers
              const normalizedName = extractionResult.metadata.examName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
              examFolder = `questions/${normalizedName}-${extractionResult.metadata.examYear}`;
            }

            // Importar serviço de processamento de imagens
            const { imageProcessingService } = await import('./imageProcessingService');

            // Processar imagens
            const imageProcessingResult = await imageProcessingService.processMultipleQuestions(
              questionsWithFilters,
              examFolder,
              () => {
                // Silencioso - não loga para evitar poluição
              }
            );

            questionsWithR2Images = imageProcessingResult.questions;
            const processedImagePaths = imageProcessingResult.processedImagePaths;

            console.log(`[JobQueue] ✅ Imagens processadas e enviadas para R2`);
            imageEmitter.emitExtraction(job.id!, 'images_processed', '✅ Imagens enviadas para R2');

            // Step 4.5: Cleanup APENAS as imagens desta prova (não todas!)
            try {
              const fs = await import('fs');

              if (processedImagePaths.length > 0) {
                let removedCount = 0;

                for (const filePath of processedImagePaths) {
                  try {
                    if (fs.existsSync(filePath)) {
                      fs.unlinkSync(filePath);
                      removedCount++;
                    }
                  } catch (err) {
                    console.warn(`[JobQueue] ⚠️ Não foi possível remover ${filePath}`);
                  }
                }

                if (removedCount > 0) {
                  console.log(`[JobQueue] ✅ Removed ${removedCount} images from THIS exam (not all images)`);
                }
              }
            } catch (cleanupError) {
              console.error(`[JobQueue] ⚠️ Erro ao limpar imagens:`, cleanupError);
            }
          } catch (imageError) {
            console.error(`[JobQueue] ⚠️ Erro ao processar imagens:`, imageError);
            questionsWithR2Images = questionsWithFilters;
          }

          // Step 5: Create draft
          try {
            // Use exam name from metadata if available (alternative scraper)
            const draftTitle = extractionResult?.metadata?.examName || `Prova - ${url}`;

            // Para source://, usar o examName do dropdown ao invés do source://
            const draftUrl = url.startsWith('source://') ? examName : url;

            // ✅ Calcular estatísticas de comentários
            const questionsWithComments = questionsWithR2Images.filter((q: any) =>
              q.professorComment && q.professorComment.trim().length > 0
            ).length;
            const questionsWithoutComments = questionsWithR2Images.length - questionsWithComments;
            const missingCommentQuestions = questionsWithR2Images
              .filter((q: any) => !q.professorComment || q.professorComment.trim().length === 0)
              .map((q: any) => q.numero || 'Sem número');

            console.log(`[JobQueue] 📝 Comentários: ${questionsWithComments}/${questionsWithR2Images.length} questões`);
            if (questionsWithoutComments > 0) {
              console.log(`[JobQueue] ⚠️ ${questionsWithoutComments} questões SEM comentário: ${missingCommentQuestions.join(', ')}`);
            }

            // ✅ Calcular estatísticas de questões anuladas
            const annulledQuestions = questionsWithR2Images.filter((q: any) => q.isAnnulled || q.is_annulled).length;
            const annulledQuestionNumbers = questionsWithR2Images
              .filter((q: any) => q.isAnnulled || q.is_annulled)
              .map((q: any) => q.numero || 'Sem número');

            if (annulledQuestions > 0) {
              console.log(`[JobQueue] 🚫 ${annulledQuestions} questões ANULADAS: ${annulledQuestionNumbers.join(', ')}`);
            }

            const draft = await draftService.create({
              jobId: job.id,
              url: draftUrl, // ✅ Nome bonito do dropdown
              title: draftTitle,
              questions: questionsWithR2Images, // ✅ COM IMAGENS DO R2!
              categorizationResults,
              metadata: {
                url: draftUrl,
                examName: extractionResult?.metadata?.examName,
                totalQuestions: questionsWithR2Images.length,
                categorizedQuestions: categorizationResults.length,
                extractionDuration: Date.now() - startTime,
                categorizationDuration: 0,
                status: 'completed',
                // ✅ Adicionar estatísticas de comentários
                commentsGenerated: questionsWithComments,
                commentsFailed: questionsWithoutComments,
                missingCommentQuestions: missingCommentQuestions,
                // ✅ Adicionar estatísticas de questões anuladas
                annulledQuestions: annulledQuestions,
                annulledQuestionNumbers: annulledQuestionNumbers,
              },
            });

            draftId = draft.id;
            // Silencioso - não loga para evitar poluição

            const { jobProgressEmitter: draftEmitter } = await import('./jobProgressEmitter');
            draftEmitter.emitDraft(job.id!, `✅ Draft criado: ${draftTitle}`);
          } catch (draftError) {
            console.error(`[JobQueue] Draft creation error:`, draftError);
            // draftId permanece undefined se houver erro
          }

          // Step 6: Create final JSON with categorized questions
          try {
            // Silencioso - não loga para evitar poluição

            const fs = await import('fs');
            const path = await import('path');

            // Criar pasta de output se não existir
            const outputDir = path.join(process.cwd(), 'output', 'processed');
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            // Gerar nome do arquivo
            const timestamp = Date.now();
            const examName = extractionResult?.metadata?.examName || 'prova';
            const normalizedName = examName
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .trim();
            const finalJsonPath = path.join(outputDir, `${normalizedName}-${timestamp}-final.json`);

            // Preparar dados finais
            const finalData = {
              metadata: {
                examName: extractionResult?.metadata?.examName,
                examYear: extractionResult?.metadata?.examYear,
                url,
                totalQuestions: questionsWithR2Images.length,
                categorizedQuestions: categorizationResults.length,
                rewrittenComments: rewriteResults.filter(r => r.rewrittenComment).length,
                processedAt: new Date().toISOString(),
                jobId: job.id,
                draftId,
              },
              questions: questionsWithR2Images.map((q: any) => ({
                numero: q.numero,
                enunciado: q.enunciado,
                alternativas: q.alternativas,
                correta: q.correta,
                imagem: q.imagem,
                professor_comment: q.professorComment, // ✅ snake_case para consistência com banco
                filterIds: q.filterIds || [],
                subFilterIds: q.subFilterIds || [],
                tags: q.tags || [],
                dificuldade: q.dificuldade,
                tempId: q.tempId,
              })),
            };

            // Salvar JSON final
            fs.writeFileSync(finalJsonPath, JSON.stringify(finalData, null, 2), 'utf-8');
            // Silencioso - não loga para evitar poluição

            const { jobProgressEmitter: jsonEmitter } = await import('./jobProgressEmitter');
            jsonEmitter.emitExtraction(job.id!, 'json_created', `✅ JSON final criado: ${path.basename(finalJsonPath)}`);
          } catch (jsonError) {
            console.error(`[JobQueue] ⚠️ Erro ao criar JSON final:`, jsonError);
            // Não bloqueia o fluxo
          }

          // Step 7: Cleanup - Remove extraction JSON only (images already cleaned)
          try {
            const fs = await import('fs');

            if (outputFilePath && fs.existsSync(outputFilePath)) {
              fs.unlinkSync(outputFilePath);
              console.log(`[JobQueue] ✅ Removed extraction JSON: ${outputFilePath}`);
            }
          } catch (cleanupError) {
            console.error(`[JobQueue] ⚠️ Erro durante cleanup:`, cleanupError);
          }

          // Check for missing questions
          const expectedTotal = 100;
          const extractedNumbers = bulkQuestions.map((_q: any, idx: number) => idx + 1);
          const allExpected = Array.from({ length: expectedTotal }, (_, i) => i + 1);
          missing = allExpected.filter(num => !extractedNumbers.includes(num));

          if (missing.length > 0) {
            missingQuestions[url] = missing;
          }
        } catch (extractError) {
          clearInterval(heartbeatInterval);
          throw extractError;
        }

        // Record success
        results.push({
          url,
          status: 'success',
          draftId: draftId || undefined, // ✅ Add draftId to result
          questionsExtracted: extractionResult?.questions?.length || 0,
          questionsSaved: bulkQuestions.length,
          missingQuestions: missing.length > 0 ? missing : undefined,
          duration: Date.now() - startTime,
        });

        // Update job data
        await job.updateData({
          ...job.data,
          progress: {
            total: urls.length,
            completed: i + 1,
            failed: results.filter(r => r.status === 'failed').length,
          },
          results,
          missingQuestions,
        });

      } catch (error) {
        // 🔓 LIBERA LOCK em caso de erro (se ainda estiver segurando)
        if (this.extractionLock) {
          this.releaseExtractionLock(job.id!);
        }

        // Check if it's a cancellation error
        if ((error as any).isCancellation || (error as Error).message.includes('cancelled')) {
          console.log(`[JobQueue] ⚠️ Job cancelled, stopping batch processing`);

          // Mark job as cancelled and stop processing
          await job.updateData({
            ...job.data,
            status: 'cancelled',
            progress: {
              total: urls.length,
              completed: i,
              failed: results.filter(r => r.status === 'failed').length,
            },
            results,
            missingQuestions,
          });

          // Throw to stop the entire job
          throw new Error('Job was cancelled');
        }

        console.error(`[JobQueue] Error processing ${url}:`, error);

        // Record failure
        results.push({
          url,
          status: 'failed',
          error: (error as Error).message,
          duration: Date.now() - startTime,
        });

        // Update job data
        await job.updateData({
          ...job.data,
          progress: {
            total: urls.length,
            completed: i + 1,
            failed: results.filter(r => r.status === 'failed').length,
          },
          results,
          missingQuestions,
        });
      }

      // Delay between URLs
      if (i < urls.length - 1 && options?.delayBetweenUrls) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenUrls));
      }
    }

    // Mark job as completed
    await job.updateData({
      ...job.data,
      status: 'completed',
      results,
      missingQuestions,
    });

    const { jobProgressEmitter: completeEmitter } = await import('./jobProgressEmitter');
    completeEmitter.emitComplete(job.id!, '✅ Job concluído com sucesso!');
  }

  /**
   * Gets job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as any;
    const data = job.data;

    // Map BullMQ states to our status types
    const mappedStatus = data.status || (state === 'waiting' || state === 'delayed' ? 'pending' : state === 'active' ? 'processing' : state);

    const status: JobStatus = {
      jobId: job.id!,
      status: mappedStatus as 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
      progress: {
        total: data.progress.total,
        completed: data.progress.completed,
        failed: data.progress.failed,
        percentage: Math.round((data.progress.completed / data.progress.total) * 100),
      },
      currentUrl: progress?.currentUrl,
      results: data.results || [],
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      duration: job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : undefined,
    };

    return status;
  }

  /**
   * Cancels a job - FORCE STOP
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();

    if (state === 'completed') {
      throw new Error('Cannot cancel completed job');
    }

    console.log(`🛑 CANCELLING job ${jobId} (state: ${state})`);

    // 1. Update job data to cancelled FIRST (this will be checked in processJob)
    try {
      await job.updateData({
        ...job.data,
        status: 'cancelled',
      });
      console.log(`✅ Job ${jobId} data updated to cancelled`);
    } catch (error) {
      console.error(`❌ Failed to update job data:`, error);
    }

    // 2. If job is waiting, just remove it
    if (state === 'waiting' || state === 'delayed') {
      try {
        await job.remove();
        console.log(`✅ Job ${jobId} removed from queue (was waiting)`);
        return;
      } catch (error) {
        console.error(`❌ Failed to remove waiting job:`, error);
      }
    }

    // 3. If job is active, try to move to failed (graceful stop)
    if (state === 'active') {
      try {
        // Use job.token if available, otherwise pass empty string
        await job.moveToFailed(new Error('Job cancelled by user'), job.token || '', true);
        console.log(`✅ Job ${jobId} moved to failed (cancelled)`);
      } catch (error) {
        console.log(`⚠️ Job ${jobId} moveToFailed failed (job may already be processing):`, (error as Error).message);
      }
    }

    // 4. If job is already failed, just update the data
    if (state === 'failed') {
      console.log(`✅ Job ${jobId} already failed, marked as cancelled`);
      return;
    }

    console.log(`✅ Job ${jobId} cancellation initiated - worker will stop at next checkpoint`);
  }

  /**
   * Lists jobs for a user
   */
  async listJobs(
    userId: string,
    filters?: JobFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ jobs: any[]; total: number }> {
    // Get all jobs (completed, failed, active, waiting)
    const [completed, failed, active, waiting] = await Promise.all([
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getActive(),
      this.queue.getWaiting(),
    ]);

    const allJobs = [...completed, ...failed, ...active, ...waiting];

    // Filter by userId
    let filteredJobs = allJobs.filter(job => job.data.userId === userId);

    // Apply filters
    if (filters?.status) {
      filteredJobs = await Promise.all(
        filteredJobs.map(async (job) => {
          const state = await job.getState();
          const actualStatus = (state === 'failed' || state === 'completed') ? state : job.data.status;
          return { job, actualStatus };
        })
      ).then(results =>
        results
          .filter(({ actualStatus }) => actualStatus === filters.status)
          .map(({ job }) => job)
      );
    }

    if (filters?.startDate) {
      filteredJobs = filteredJobs.filter(job =>
        new Date(job.data.createdAt) >= filters.startDate!
      );
    }

    if (filters?.endDate) {
      filteredJobs = filteredJobs.filter(job =>
        new Date(job.data.createdAt) <= filters.endDate!
      );
    }

    // Sort by createdAt desc
    filteredJobs.sort((a, b) =>
      new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()
    );

    // Paginate
    const total = filteredJobs.length;
    const start = (page - 1) * limit;
    const paginatedJobs = filteredJobs.slice(start, start + limit);

    // Format jobs
    const jobs = await Promise.all(
      paginatedJobs.map(async (job) => {
        const state = await job.getState();
        // Use the actual BullMQ state if job is failed/completed
        const actualStatus = (state === 'failed' || state === 'completed') ? state : job.data.status;
        return {
          jobId: job.id,
          status: actualStatus,
          urls: job.data.urls,
          progress: job.data.progress,
          results: job.data.results,
          createdAt: job.data.createdAt,
          startedAt: job.processedOn ? new Date(job.processedOn) : null,
          completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        };
      })
    );

    return { jobs, total };
  }

  /**
   * Get ALL jobs from Redis with detailed status
   */
  async getAllJobsDetailed(): Promise<{
    total: number;
    byStatus: {
      completed: number;
      failed: number;
      active: number;
      waiting: number;
      delayed: number;
    };
    jobs: Array<{
      id: string;
      status: string;
      userId: string;
      urls: string[];
      createdAt: Date;
      progress: any;
    }>;
  }> {
    const [completed, failed, active, waiting, delayed] = await Promise.all([
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getActive(),
      this.queue.getWaiting(),
      this.queue.getDelayed(),
    ]);

    const allJobs = [...completed, ...failed, ...active, ...waiting, ...delayed];

    const jobs = await Promise.all(
      allJobs.map(async (job) => {
        const state = await job.getState();
        return {
          id: job.id!,
          status: state,
          userId: job.data.userId,
          urls: job.data.urls,
          createdAt: job.data.createdAt,
          progress: job.data.progress,
        };
      })
    );

    return {
      total: allJobs.length,
      byStatus: {
        completed: completed.length,
        failed: failed.length,
        active: active.length,
        waiting: waiting.length,
        delayed: delayed.length,
      },
      jobs,
    };
  }

  /**
   * Remove ALL jobs from Redis (nuclear option)
   */
  async obliterateAllJobs(): Promise<{
    found: number;
    removed: number;
    failed: number;
    byStatus: {
      completed: number;
      failed: number;
      active: number;
      waiting: number;
      delayed: number;
    };
  }> {
    // Get all jobs first
    const [completed, failed, active, waiting, delayed] = await Promise.all([
      this.queue.getCompleted(),
      this.queue.getFailed(),
      this.queue.getActive(),
      this.queue.getWaiting(),
      this.queue.getDelayed(),
    ]);

    const allJobs = [...completed, ...failed, ...active, ...waiting, ...delayed];
    const found = allJobs.length;

    let removed = 0;
    let failedToRemove = 0;

    // For active jobs, try to force remove them by removing locks first
    for (const job of active) {
      try {
        // Try to remove the lock key directly from Redis
        const lockKey = `bull:scraper-batch:${job.id}:lock`;
        await redisForQueue.del(lockKey);

        // Now try to remove the job
        await job.remove();
        removed++;
      } catch (error) {
        // If that fails, try moving to failed first
        try {
          await job.moveToFailed(new Error('Job cancelled by obliterate'), '', true);
          await job.remove();
          removed++;
        } catch (error2) {
          failedToRemove++;
        }
      }
    }

    // Remove non-active jobs normally
    const nonActiveJobs = [...completed, ...failed, ...waiting, ...delayed];
    for (const job of nonActiveJobs) {
      try {
        await job.remove();
        removed++;
      } catch (error) {
        failedToRemove++;
      }
    }

    // Drain the queue (removes waiting jobs)
    try {
      await this.queue.drain();
    } catch (error) {
      // Silently fail
    }

    // Clean completed and failed jobs
    try {
      await this.queue.clean(0, 1000, 'completed');
      await this.queue.clean(0, 1000, 'failed');
    } catch (error) {
      // Silently fail
    }

    // Nuclear option: if there are still active jobs, obliterate them from Redis directly
    if (failedToRemove > 0) {
      try {
        // Get remaining active jobs
        const remainingActive = await this.queue.getActive();

        for (const job of remainingActive) {
          try {
            // Remove all Redis keys related to this job
            const jobKey = `bull:scraper-batch:${job.id}`;
            const lockKey = `${jobKey}:lock`;

            await redisForQueue.del(jobKey);
            await redisForQueue.del(lockKey);

            // Remove from active list
            await redisForQueue.lrem('bull:scraper-batch:active', 0, job.id!);

            removed++;
            failedToRemove--;
          } catch (error) {
            // Still failed
          }
        }
      } catch (error) {
        // Silently fail
      }
    }

    return {
      found,
      removed,
      failed: failedToRemove,
      byStatus: {
        completed: completed.length,
        failed: failed.length,
        active: active.length,
        waiting: waiting.length,
        delayed: delayed.length,
      },
    };
  }

  /**
   * Remove jobs by status
   */
  async removeJobsByStatus(status: 'completed' | 'failed' | 'waiting' | 'active' | 'delayed'): Promise<{
    found: number;
    removed: number;
    failed: number;
    jobIds: string[];
  }> {
    let jobs: any[] = [];

    switch (status) {
      case 'completed':
        jobs = await this.queue.getCompleted();
        break;
      case 'failed':
        jobs = await this.queue.getFailed();
        break;
      case 'active':
        jobs = await this.queue.getActive();
        break;
      case 'waiting':
        jobs = await this.queue.getWaiting();
        break;
      case 'delayed':
        jobs = await this.queue.getDelayed();
        break;
    }

    const found = jobs.length;
    let removed = 0;
    let failedToRemove = 0;
    const removedJobIds: string[] = [];

    for (const job of jobs) {
      try {
        await job.remove();
        removed++;
        removedJobIds.push(job.id!);
      } catch (error) {
        failedToRemove++;
      }
    }

    return {
      found,
      removed,
      failed: failedToRemove,
      jobIds: removedJobIds,
    };
  }

  /**
   * Remove a specific job by ID (force delete)
   */
  async forceRemoveJob(jobId: string): Promise<boolean> {
    console.log(`🗑️ Force removing job ${jobId}...`);

    const job = await this.queue.getJob(jobId);

    if (!job) {
      console.log(`⚠️ Job ${jobId} not found`);
      return false;
    }

    try {
      await job.remove();
      console.log(`✅ Job ${jobId} removed`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.worker.close();
  }
}

export default new JobQueueService();
