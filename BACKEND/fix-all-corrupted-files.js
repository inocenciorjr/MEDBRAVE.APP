const fs = require('fs');
const path = require('path');

// Configurações
const srcDir = path.join(__dirname, 'src');
const backupSuffix = '.backup-auto';
const maxFileSize = 50000; // Arquivos com mais de 50k linhas são suspeitos
const corruptionPatterns = [
  /import.*import/g, // Imports duplicados
  /:}/g, // Padrão :}
  /\}\s*import/g, // } seguido de import
  /export.*export/g, // Exports duplicados
  /class.*class/g, // Classes duplicadas
  /function.*function/g, // Funções duplicadas
];

// Templates limpos para arquivos específicos
const templates = {
  'dataImportExportController.ts': `import { Request, Response } from 'express';
import { container } from 'tsyringe';
import { ImportDataJobUseCase } from '../use-cases/ImportDataJobUseCase';
import { ExportDataJobUseCase } from '../use-cases/ExportDataJobUseCase';
import { GetDataJobsUseCase } from '../use-cases/GetDataJobsUseCase';
import { DeleteDataJobUseCase } from '../use-cases/DeleteDataJobUseCase';
import { AppError } from '../../../shared/errors/AppError';
import logger from '../../../utils/logger';

export enum DataJobType {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
}

export enum DataJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface DataJob {
  id: string;
  user_id: string;
  type: DataJobType;
  status: DataJobStatus;
  file_name: string;
  file_path?: string;
  progress: number;
  total_items?: number;
  processed_items?: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export class DataImportExportController {
  async importData(request: Request, response: Response): Promise<Response> {
    try {
      const { userId } = request;
      const file = request.file;

      if (!file) {
        throw new AppError('Arquivo não fornecido', 400);
      }

      const importDataJob = container.resolve(ImportDataJobUseCase);
      const job = await importDataJob.execute({
        userId,
        fileName: file.originalname,
        filePath: file.path,
        fileBuffer: file.buffer,
      });

      return response.status(201).json(job);
    } catch (error) {
      logger.error('[importData] Erro:', error);
      throw error;
    }
  }

  async exportData(request: Request, response: Response): Promise<Response> {
    try {
      const { userId } = request;
      const { format, filters } = request.body;

      const exportDataJob = container.resolve(ExportDataJobUseCase);
      const job = await exportDataJob.execute({
        userId,
        format: format || 'json',
        filters: filters || {},
      });

      return response.status(201).json(job);
    } catch (error) {
      logger.error('[exportData] Erro:', error);
      throw error;
    }
  }

  async getJobs(request: Request, response: Response): Promise<Response> {
    try {
      const { userId } = request;
      const { page = 1, limit = 10, type, status } = request.query;

      const getDataJobs = container.resolve(GetDataJobsUseCase);
      const jobs = await getDataJobs.execute({
        userId,
        page: Number(page),
        limit: Number(limit),
        type: type as DataJobType,
        status: status as DataJobStatus,
      });

      return response.json(jobs);
    } catch (error) {
      logger.error('[getJobs] Erro:', error);
      throw error;
    }
  }

  async deleteJob(request: Request, response: Response): Promise<Response> {
    try {
      const { userId } = request;
      const { jobId } = request.params;

      const deleteDataJob = container.resolve(DeleteDataJobUseCase);
      await deleteDataJob.execute(jobId, userId);

      return response.status(204).send();
    } catch (error) {
      logger.error('[deleteJob] Erro:', error);
      throw error;
    }
  }

  async executeImportJob(request: Request, response: Response): Promise<Response> {
    try {
      const { userId } = request;
      const { jobId } = request.params;

      const importDataJob = container.resolve(ImportDataJobUseCase);
      const job = await importDataJob.executeJob(jobId, userId);

      return response.json(job);
    } catch (error) {
      logger.error('[executeImportJob] Erro:', error);
      throw error;
    }
  }
}
`,

  'SupabaseFSRSService.ts': `import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../../utils/logger';
import { AppError } from '../../../shared/errors/AppError';

export enum FSRSGrade {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
}

export enum FSRSState {
  NEW = 'NEW',
  LEARNING = 'LEARNING',
  REVIEW = 'REVIEW',
  RELEARNING = 'RELEARNING',
}

export interface FSRSCard {
  id: string;
  user_id: string;
  content_id: string;
  deck_id: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FSRSState;
  last_review: Date | null;
  created_at: string;
  updated_at: string;
}

export class SupabaseFSRSService {
  private supabase: SupabaseClient;
  
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  public async getCardByFlashcard_id(contentId: string, user_id: string): Promise<FSRSCard | null> {
    try {
      const { data, error } = await this.supabase
        .from('fsrs_cards')
        .select('*')
        .eq('content_id', contentId)
        .eq('user_id', user_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new AppError('Erro ao buscar card FSRS', 500);
      }

      return {
        ...data,
        due: new Date(data.due),
        last_review: data.last_review ? new Date(data.last_review) : null,
      };
    } catch (error) {
      logger.error('[getCardByFlashcard_id] Erro:', error);
      throw new AppError('Erro ao buscar card FSRS', 500);
    }
  }

  public createNewCard(contentId: string, user_id: string, deck_id: string): FSRSCard {
    const now = new Date();
    return {
      id: this.generateId(),
      user_id,
      content_id: contentId,
      deck_id,
      due: now,
      stability: 4.0,
      difficulty: 4.0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: FSRSState.NEW,
      last_review: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
`,

  'flashcardController.ts': `import { Response } from 'express';
import { AuthenticatedRequest } from '../../../../domain/auth/middleware/supabaseAuth.middleware';
import { CreateFlashcardUseCase } from '../use-cases/CreateFlashcardUseCase';
import { GetFlashcardByIdUseCase } from '../use-cases/GetFlashcardByIdUseCase';
import { GetUserFlashcardsUseCase } from '../use-cases/GetUserFlashcardsUseCase';
import { UpdateFlashcardUseCase } from '../use-cases/UpdateFlashcardUseCase';
import { DeleteFlashcardUseCase } from '../use-cases/DeleteFlashcardUseCase';
import { RecordFlashcardReviewUseCase } from '../use-cases/RecordFlashcardReviewUseCase';
import { validate } from '../validation/flashcardSchemas';
import { container } from 'tsyringe';

export class FlashcardController {
  async create(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const validatedData = validate('create', request.body);

    const createFlashcard = container.resolve(CreateFlashcardUseCase);
    const flashcard = await createFlashcard.execute({
      ...validatedData,
      user_id: userId,
    });

    return response.status(201).json(flashcard);
  }

  async getById(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const { id } = request.params;

    const getFlashcard = container.resolve(GetFlashcardByIdUseCase);
    const flashcard = await getFlashcard.execute(id, userId);

    return response.json(flashcard);
  }

  async getUserFlashcards(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const filters = request.query;

    const getUserFlashcards = container.resolve(GetUserFlashcardsUseCase);
    const result = await getUserFlashcards.execute(userId, filters);

    return response.json(result);
  }

  async update(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const { id } = request.params;
    const validatedData = validate('update', request.body);

    const updateFlashcard = container.resolve(UpdateFlashcardUseCase);
    const flashcard = await updateFlashcard.execute(id, userId, validatedData);

    return response.json(flashcard);
  }

  async delete(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const { id } = request.params;

    const deleteFlashcard = container.resolve(DeleteFlashcardUseCase);
    await deleteFlashcard.execute(id, userId);

    return response.status(204).send();
  }

  async review(request: AuthenticatedRequest, response: Response): Promise<Response> {
    const { userId } = request;
    const { id } = request.params;
    const { grade, reviewTime } = request.body;

    const recordReview = container.resolve(RecordFlashcardReviewUseCase);
    const result = await recordReview.execute({
      flashcard_id: id,
      user_id: userId,
      grade,
      reviewTime,
    });

    return response.json(result);
  }
}
`
};

function isFileCorrupted(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Verificar tamanho excessivo
    if (lines.length > maxFileSize) {
      console.log(`❌ ${filePath}: Arquivo muito grande (${lines.length} linhas)`);
      return true;
    }
    
    // Verificar padrões de corrupção
    for (const pattern of corruptionPatterns) {
      if (pattern.test(content)) {
        console.log(`❌ ${filePath}: Padrão de corrupção detectado`);
        return true;
      }
    }
    
    // Verificar imports duplicados
    const imports = content.match(/^import.*$/gm) || [];
    const uniqueImports = new Set(imports);
    if (imports.length > uniqueImports.size * 2) {
      console.log(`❌ ${filePath}: Imports duplicados detectados`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ ${filePath}: Erro ao ler arquivo - ${error.message}`);
    return true;
  }
}

function findCorruptedFiles(dir) {
  const corruptedFiles = [];
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Pular diretórios específicos
        if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
          scanDirectory(fullPath);
        }
      } else if (item.endsWith('.ts') || item.endsWith('.js')) {
        // Pular arquivos de backup
        if (!item.includes('.backup') && !item.includes('.bak')) {
          if (isFileCorrupted(fullPath)) {
            corruptedFiles.push(fullPath);
          }
        }
      }
    }
  }
  
  scanDirectory(dir);
  return corruptedFiles;
}

function createBackup(filePath) {
  const backupPath = filePath + backupSuffix;
  fs.copyFileSync(filePath, backupPath);
  console.log(`📁 Backup criado: ${backupPath}`);
}

function fixFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(srcDir, filePath);
  
  console.log(`🔧 Corrigindo: ${relativePath}`);
  
  // Criar backup
  createBackup(filePath);
  
  // Verificar se temos um template específico
  if (templates[fileName]) {
    console.log(`📋 Usando template para ${fileName}`);
    fs.writeFileSync(filePath, templates[fileName], 'utf8');
    const newLines = templates[fileName].split('\n').length;
    console.log(`✅ ${fileName} reconstruído (${newLines} linhas)`);
    return;
  }
  
  // Tentar correção automática
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLines = content.split('\n').length;
    
    // Remover padrões de corrupção
    for (const pattern of corruptionPatterns) {
      content = content.replace(pattern, '');
    }
    
    // Normalizar quebras de linha
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remover linhas em branco excessivas
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // Remover imports duplicados
    const lines = content.split('\n');
    const seenImports = new Set();
    const cleanedLines = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        if (!seenImports.has(line.trim())) {
          seenImports.add(line.trim());
          cleanedLines.push(line);
        }
      } else {
        cleanedLines.push(line);
      }
    }
    
    content = cleanedLines.join('\n');
    
    // Escrever arquivo corrigido
    fs.writeFileSync(filePath, content, 'utf8');
    
    const newLines = content.split('\n').length;
    console.log(`✅ ${fileName} corrigido (${originalLines} → ${newLines} linhas)`);
    
  } catch (error) {
    console.log(`❌ Erro ao corrigir ${fileName}: ${error.message}`);
  }
}

function main() {
  console.log('🔍 Iniciando busca por arquivos corrompidos...');
  console.log(`📂 Diretório: ${srcDir}`);
  
  const corruptedFiles = findCorruptedFiles(srcDir);
  
  if (corruptedFiles.length === 0) {
    console.log('✅ Nenhum arquivo corrompido encontrado!');
    return;
  }
  
  console.log(`\n📊 Encontrados ${corruptedFiles.length} arquivos corrompidos:`);
  corruptedFiles.forEach((file, index) => {
    const relativePath = path.relative(srcDir, file);
    console.log(`${index + 1}. ${relativePath}`);
  });
  
  console.log('\n🔧 Iniciando correção automática...');
  
  let fixed = 0;
  for (const file of corruptedFiles) {
    try {
      fixFile(file);
      fixed++;
    } catch (error) {
      console.log(`❌ Erro ao corrigir ${file}: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Resumo:`);
  console.log(`- Arquivos encontrados: ${corruptedFiles.length}`);
  console.log(`- Arquivos corrigidos: ${fixed}`);
  console.log(`- Arquivos com erro: ${corruptedFiles.length - fixed}`);
  
  if (fixed > 0) {
    console.log('\n🎉 Correção concluída! Reinicie o servidor para verificar os resultados.');
  }
}

// Executar
main();