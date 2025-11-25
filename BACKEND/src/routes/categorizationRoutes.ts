/**
 * Categorization Routes
 * Handles AI-powered question categorization endpoints
 */
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createOpenRouterClient } from '../services/openRouterClient';
import { createGeminiClient } from '../services/geminiClient';
import { createMinimaxClient } from '../services/minimaxClient';
import { createGptOssClient } from '../services/gptOssClient';
import { createQwenClient } from '../services/qwenClient';
import { createGLMClient } from '../services/glmClient';
import { createFilterHierarchyManager } from '../services/filterHierarchyManager';
import { createCategorizationService, Question } from '../services/categorizationService';
import { createBatchProcessor } from '../services/batchProcessor';
import { createFeedbackAnalyzer } from '../services/feedbackAnalyzer';
import { supabaseAuthMiddleware as authMiddleware } from '../domain/auth/middleware/supabaseAuth.middleware';
import { adminMiddleware } from '../domain/auth/middleware/admin.middleware';

const router = Router();

// Note: Auth middleware will be applied per route, not globally
// This allows SSE endpoint to work without auth issues

// Active jobs tracking removido - usar WebSocket

// Lazy initialization of services
let servicesInitialized = false;
let aiClient: any;
let filterHierarchyManager: any;
let categorizationService: any;
let batchProcessor: any;
let feedbackAnalyzer: any;

function initializeServices() {
  if (servicesInitialized) {
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const useGemini = process.env.USE_GEMINI === 'true';
  const useLMStudio = process.env.USE_LM_STUDIO === 'true';
  const useMinimax = process.env.USE_MINIMAX === 'true';
  const useGptOss = process.env.USE_GPT_OSS === 'true';
  const useQwen = process.env.USE_QWEN === 'true';
  const useGLM = process.env.USE_GLM === 'true';

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  // Choose AI provider (priority: GLM > Qwen3 > GPT-OSS > MiniMax > Gemini > LM Studio > OpenRouter)
  if (useGLM) {
    const glmApiKey = process.env.GLM_API_KEY || '';
    if (!glmApiKey) {
      throw new Error('GLM API key is missing. Please set GLM_API_KEY environment variable.');
    }
    console.log('⚡ Using GLM-4.6 for AI categorization (200K context, fast reasoning!)');
    aiClient = createGLMClient(glmApiKey);
  } else if (useQwen) {
    const qwenApiKey = process.env.QWEN_API_KEY || '';
    if (!qwenApiKey) {
      throw new Error('Qwen API key is missing. Please set QWEN_API_KEY environment variable.');
    }
    console.log('🚀 Using Qwen3-235B-A22B for AI categorization (235B params, 22B active, 32k-131k context!)');
    aiClient = createQwenClient(qwenApiKey);
  } else if (useGptOss) {
    const gptOssApiKey = process.env.GPT_OSS_API_KEY || '';
    if (!gptOssApiKey) {
      throw new Error('GPT-OSS API key is missing. Please set GPT_OSS_API_KEY environment variable.');
    }
    console.log('🧠 Using GPT-OSS 120B for AI categorization (high reasoning, 128k output!)');
    aiClient = createGptOssClient(gptOssApiKey);
  } else if (useMinimax) {
    const minimaxApiKey = process.env.MINIMAX_API_KEY || '';
    if (!minimaxApiKey) {
      throw new Error('MiniMax API key is missing. Please set MINIMAX_API_KEY environment variable.');
    }
    console.log('🚀 Using MiniMax for AI categorization (200k input, 128k output tokens!)');
    aiClient = createMinimaxClient(minimaxApiKey);
  } else if (useGemini) {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    if (!geminiApiKey) {
      throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable. Get your key at https://aistudio.google.com/');
    }
    console.log('🌟 Using Google Gemini for AI categorization');
    aiClient = createGeminiClient(geminiApiKey);
  } else if (useLMStudio) {
    console.log('🏠 Using LM Studio (local) for AI categorization');
    aiClient = createOpenRouterClient('not-needed'); // LM Studio doesn't need key
  } else {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key is missing. Please set OPENROUTER_API_KEY environment variable. Get your key at https://openrouter.ai/');
    }
    console.log('☁️ Using OpenRouter for AI categorization');
    aiClient = createOpenRouterClient(openRouterApiKey);
  }

  filterHierarchyManager = createFilterHierarchyManager(supabaseUrl, supabaseKey);
  categorizationService = createCategorizationService(supabaseUrl, supabaseKey, aiClient, filterHierarchyManager);
  batchProcessor = createBatchProcessor(categorizationService);
  feedbackAnalyzer = createFeedbackAnalyzer(supabaseUrl, supabaseKey);

  servicesInitialized = true;
  console.log('Categorization services initialized successfully');
}

/**
 * POST /api/categorization/start
 * Start a new categorization job
 */
router.post('/start', authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
  try {
    // DEBUG: Log RAW body
    console.log('🔍 RAW req.body keys:', Object.keys(req.body));
    console.log('🔍 RAW req.body.questions type:', typeof req.body.questions);
    console.log('🔍 RAW req.body.questions length:', req.body.questions?.length);

    // Initialize services on first use
    initializeServices();

    const { questions: draftQuestions, options = {} } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!draftQuestions || !Array.isArray(draftQuestions) || draftQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'questions is required and must be a non-empty array',
      });
    }

    // DEBUG: Log received questions
    console.log(`📥 Received ${draftQuestions.length} questions from frontend`);
    console.log(`📋 First question:`, {
      id: draftQuestions[0].id,
      tempId: draftQuestions[0].tempId,
      numero: draftQuestions[0].numero,
      enunciado: draftQuestions[0].enunciado?.substring(0, 100)
    });

    // Use draft questions directly (from scraper/bulk upload)
    const questions = draftQuestions;

    // Create job in database
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: job, error: jobError } = await supabase
      .from('categorization_jobs')
      .insert({
        user_id: userId,
        status: 'pending',
        total_questions: questions.length,
        config: options,
      })
      .select()
      .single();

    if (jobError) {
      return res.status(500).json({
        success: false,
        error: `Failed to create job: ${jobError.message}`,
      });
    }

    const jobId = job.id;

    // Job tracking via WebSocket agora

    // Start processing in background
    processJobInBackground(jobId, questions, options);

    // Estimate time (rough estimate: 5 seconds per question)
    const estimatedTime = questions.length * 5;

    return res.json({
      success: true,
      jobId,
      totalQuestions: questions.length,
      estimatedTime,
      status: 'started',
    });
  } catch (error) {
    console.error('Error starting categorization:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// SSE endpoint removido - usar WebSocket para progresso em tempo real

/**
 * POST /api/categorization/apply
 * Apply categorization to a question
 */
router.post('/apply', authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
  try {
    // Initialize services on first use
    initializeServices();

    const { questionId, categorization } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!questionId || !categorization) {
      return res.status(400).json({
        success: false,
        error: 'questionId and categorization are required',
      });
    }

    await categorizationService.applyCategorization(questionId, categorization);

    return res.json({
      success: true,
      message: 'Categorization applied successfully',
    });
  } catch (error) {
    console.error('Error applying categorization:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/categorization/feedback
 * Log feedback for manual correction
 */
router.post('/feedback', authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
  try {
    // Initialize services on first use
    initializeServices();

    const { questionId, originalCategorization, correctedCategorization, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!questionId || !originalCategorization || !correctedCategorization) {
      return res.status(400).json({
        success: false,
        error: 'questionId, originalCategorization, and correctedCategorization are required',
      });
    }

    await categorizationService.logFeedback(
      questionId,
      originalCategorization,
      correctedCategorization,
      userId,
      reason
    );

    return res.json({
      success: true,
      message: 'Feedback logged successfully',
    });
  } catch (error) {
    console.error('Error logging feedback:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/categorization/results/:jobId
 * Get categorization results for a completed job
 */
router.get('/results/:jobId', authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: job, error } = await supabase
      .from('categorization_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (error || !job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.json({
      success: true,
      results: job.results || [],
      status: job.status,
    });
  } catch (error) {
    console.error('Error getting results:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/categorization/metrics
 * Get categorization metrics
 */
router.get('/metrics', authMiddleware as any, adminMiddleware as any, async (req: Request, res: Response) => {
  try {
    // Initialize services on first use
    initializeServices();

    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const metrics = await feedbackAnalyzer.getPrecisionMetrics();

    return res.json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Background job processor
 */
async function processJobInBackground(
  jobId: string,
  questions: any[],
  options: any
) {
  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  try {
    // Update job status
    await supabase
      .from('categorization_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Convert questions to proper format
    const formattedQuestions: Question[] = questions.map(q => ({
      id: q.id,
      numero: q.numero || q.number || '',
      enunciado: q.enunciado || q.content || '',
      alternativas: q.alternativas || q.options || [],
      correta: q.correta !== undefined ? q.correta : q.correct_answer,
      imagem: q.imagem || q.image_url,
      tempId: q.temp_id,
    }));

    // CRITICAL: Load filter hierarchy BEFORE processing batches (FORCE RELOAD)
    console.log('🔄 Loading filter hierarchy before categorization (forcing reload)...');
    await filterHierarchyManager.loadHierarchy(true); // Force reload = true
    console.log('✅ Filter hierarchy loaded successfully');

    // Process with batch processor (progresso via WebSocket)
    const { jobProgressEmitter } = await import('../services/jobProgressEmitter');
    
    const results = await batchProcessor.processBatches(
      formattedQuestions,
      options,
      (progress: any) => {
        // Emitir progresso via WebSocket
        jobProgressEmitter.emitCategorization(
          jobId,
          'categorizing',
          `Categorizando questão ${progress.processedQuestions} de ${progress.totalQuestions}`,
          progress.processedQuestions,
          progress.totalQuestions
        );
      }
    );

    // Calculate final stats
    const successCount = results.filter((r: any) => r.status === 'success').length;
    const failureCount = results.filter((r: any) => r.status === 'failed').length;
    const ambiguousCount = results.filter((r: any) => r.status === 'ambiguous' || r.status === 'manual_review').length;

    // Emitir evento de conclusão
    jobProgressEmitter.emitComplete(
      jobId,
      `Categorização concluída: ${successCount} sucesso, ${failureCount} falhas, ${ambiguousCount} ambíguas`
    );

    // Update job in database
    await supabase
      .from('categorization_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_questions: results.length,
        success_count: successCount,
        failure_count: failureCount,
        ambiguous_count: ambiguousCount,
        results: results,
      })
      .eq('id', jobId);

    // Completion enviado via WebSocket

    console.log(`Job ${jobId} completed: ${successCount} success, ${failureCount} failed, ${ambiguousCount} ambiguous`);
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);

    // Update job status
    await supabase
      .from('categorization_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', jobId);

    // Erro enviado via WebSocket
  }
}

export default router;
