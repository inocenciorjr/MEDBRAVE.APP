import { Request, Response } from 'express';
import { firestore } from 'firebase-admin';
import { StudyTask } from '../types/StudyTask';
import { UnifiedReviewService } from '../../studyTools/unifiedReviews/services/UnifiedReviewService';
import { FSRSServiceFactory } from '../../srs/factory/fsrsServiceFactory';
import { QuestionRetentionService } from '../../questions/services/QuestionRetentionService';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase/firestore';


const PLANNER_TASKS_COLLECTION = 'plannerTasks';

// Instâncias dos serviços (ajustar para DI/factory se necessário)
const db = firestore();
const fsrsService = FSRSServiceFactory.createService(db);
const unifiedReviewService = new UnifiedReviewService(db, fsrsService, null as any);
const retentionService = new QuestionRetentionService(db);

function toISO(dateOrTimestamp: any): string {
  if (!dateOrTimestamp) return new Date().toISOString();
  if (typeof dateOrTimestamp === 'string') return dateOrTimestamp;
  if (dateOrTimestamp.toDate) return dateOrTimestamp.toDate().toISOString();
  if (dateOrTimestamp instanceof Date) return dateOrTimestamp.toISOString();
  return new Date(dateOrTimestamp).toISOString();
}

// Buscar tarefas manuais do usuário
async function getManualTasks(userId: string, start?: string, end?: string): Promise<StudyTask[]> {
  let query = db.collection(PLANNER_TASKS_COLLECTION).where('userId', '==', userId);
  if (start) query = query.where('scheduledDate', '>=', start);
  if (end) query = query.where('scheduledDate', '<=', end);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data() as StudyTask);
}

export async function getPlannerTasks(req: Request, res: Response) {
  const { userId, start, end } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId obrigatório' });

  // ✅ OTIMIZAÇÃO: Reduzir limite para evitar consultas massivas
  const fsrsReviews = await unifiedReviewService.getDueReviews(userId as string, { dueOnly: false, limit: 200 }); // ✅ MUDANÇA: 200 em vez de 1000
  
  // Filtrar revisões FSRS pelo período solicitado
  let filteredReviews = fsrsReviews;
  if (start || end) {
    filteredReviews = fsrsReviews.filter(item => {
      const itemDate = toISO(item.due).slice(0, 10);
      if (start && itemDate < start) return false;
      if (end && itemDate > end) return false;
      return true;
    });
  }

  // Agrupar flashcards por data e tipo de conteúdo
  const reviewsByDate = new Map<string, { flashcards: number; questions: number; items: any[] }>();
  
  filteredReviews.forEach(item => {
    const date = toISO(item.due).slice(0, 10);
    if (!reviewsByDate.has(date)) {
      reviewsByDate.set(date, { flashcards: 0, questions: 0, items: [] });
    }
    const dateGroup = reviewsByDate.get(date)!;
    dateGroup.items.push(item);
    
    if (item.contentType === 'FLASHCARD') {
      dateGroup.flashcards++;
    } else if (item.contentType === 'QUESTION') {
      dateGroup.questions++;
    }
  });

  // Criar tarefas agregadas por data
  const fsrsTasks: StudyTask[] = [];
  reviewsByDate.forEach((group, date) => {
    if (group.flashcards > 0) {
      fsrsTasks.push({
        id: `fsrs_flashcards_${date}`,
        userId: userId as string,
        type: 'FSRS_REVIEW',
        title: `${group.flashcards} Flashcards para revisar`,
        description: `Revisão de ${group.flashcards} flashcard${group.flashcards > 1 ? 's' : ''} programada${group.flashcards > 1 ? 's' : ''} para hoje`,
        scheduledDate: `${date}T09:00:00.000Z`,
        status: 'PENDING',
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'UNIFIED_REVIEW',
        metadata: {
          contentType: 'FLASHCARD',
          count: group.flashcards,
          reviewIds: group.items.filter(item => item.contentType === 'FLASHCARD').map(item => item.id)
        }
      });
    }
    
    if (group.questions > 0) {
      fsrsTasks.push({
        id: `fsrs_questions_${date}`,
        userId: userId as string,
        type: 'FSRS_REVIEW',
        title: `${group.questions} Questões para revisar`,
        description: `Revisão de ${group.questions} questõ${group.questions > 1 ? 'es' : 'ão'} programada${group.questions > 1 ? 's' : ''} para hoje`,
        scheduledDate: `${date}T10:00:00.000Z`,
        status: 'PENDING',
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'UNIFIED_REVIEW',
        metadata: {
          contentType: 'QUESTION',
          count: group.questions,
          reviewIds: group.items.filter(item => item.contentType === 'QUESTION').map(item => item.id)
        }
      });
    }
  });

  // 2. Buscar recomendações inteligentes (analytics)
  const prediction = await retentionService.predictPerformance();
  const recommendationTasks: StudyTask[] = (prediction.focusRecommendations || []).map((rec, idx) => ({
    id: `rec_${idx}`,
    userId: userId as string,
    type: 'RECOMMENDATION',
    title: `Foco: ${rec.area}`,
    description: rec.reason,
    scheduledDate: new Date().toISOString(),
    status: 'PENDING',
    priority: rec.priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'ANALYTICS'
  }));

  // 3. Buscar tarefas manuais reais
  const manualTasks: StudyTask[] = await getManualTasks(userId as string, start as string, end as string);

  // 4. Unificar tudo
  const allTasks = [...fsrsTasks, ...recommendationTasks, ...manualTasks];
  return res.json(allTasks);
}

export async function createTask(req: Request, res: Response) {
  const { userId, title, description, scheduledDate, manualType, targetUrl, metadata, priority } = req.body;
  if (!userId || !title || !scheduledDate) {
    return res.status(400).json({ error: 'userId, title e scheduledDate são obrigatórios' });
  }
  const now = new Date().toISOString();
  const id = uuidv4();
  const task: StudyTask = {
    id,
    userId,
    type: 'MANUAL',
    title,
    description,
    scheduledDate,
    status: 'PENDING',
    priority: priority || 'MEDIUM',
    createdAt: now,
    updatedAt: now,
    source: 'USER',
    manualType,
    targetUrl,
    metadata
  };
  await db.collection(PLANNER_TASKS_COLLECTION).doc(id).set(task);
  return res.status(201).json(task);
}

export async function updateTask(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;
  if (!id) return res.status(400).json({ error: 'id obrigatório' });
  const docRef = db.collection(PLANNER_TASKS_COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return res.status(404).json({ error: 'Tarefa não encontrada' });
  const updatedAt = new Date().toISOString();
  await docRef.update({ ...updates, updatedAt });
  const updatedTask = (await docRef.get()).data();
  return res.json(updatedTask);
}

export async function deleteTask(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id obrigatório' });
  await db.collection(PLANNER_TASKS_COLLECTION).doc(id).delete();
  return res.json({ message: 'Tarefa deletada com sucesso' });
}

interface StudyPlan {
  id: string;
  userId: string;
  name: string;
  description: string;
  schedule: Array<{
    date: string;
    topics: string[];
    questionCount: number;
    estimatedDuration: number;
  }>;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UserProgress {
  userId: string;
  totalStudyTime: number;
  questionsAnswered: number;
  accuracy: number;
  weakAreas: string[];
  strongAreas: string[];
  lastActivity: Timestamp;
}

export class PlannerService {
  private retentionService: QuestionRetentionService;

  constructor(
    retentionService: QuestionRetentionService
  ) {
    this.retentionService = retentionService;
  }

  async createStudyPlan(userId: string): Promise<StudyPlan> {
    // Obter predição de performance sem parâmetros
    await this.retentionService.predictPerformance();
    
    // Criar plano baseado na predição
    const plan: StudyPlan = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      name: 'Plano Personalizado',
      description: 'Plano gerado automaticamente baseado na sua performance',
      schedule: [],
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    return plan;
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    // Implementação mock
    return {
      userId,
      totalStudyTime: 0,
      questionsAnswered: 0,
      accuracy: 0,
      weakAreas: [],
      strongAreas: [],
      lastActivity: Timestamp.now()
    };
  }
}