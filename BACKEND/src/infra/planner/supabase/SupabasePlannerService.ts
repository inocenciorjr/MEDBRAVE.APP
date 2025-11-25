import { Request, Response } from 'express';
 
import { StudyTask } from '../../../domain/planner/types/StudyTask';
import { UnifiedReviewService } from '../../../domain/studyTools/unifiedReviews/services';

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../config/supabaseAdmin';

const PLANNER_TASKS_TABLE = 'planner_tasks';

// Instâncias dos serviços (ajustar para DI/factory se necessário)
const unifiedReviewService = new UnifiedReviewService(supabase);

function toISO(dateOrTimestamp: any): string {
  if (!dateOrTimestamp) {
return new Date().toISOString();
}
  if (typeof dateOrTimestamp === 'string') {
return dateOrTimestamp;
}
  if (dateOrTimestamp.toDate) {
return dateOrTimestamp.toDate().toISOString();
}
  if (dateOrTimestamp instanceof Date) {
return dateOrTimestamp.toISOString();
}
  return new Date(dateOrTimestamp).toISOString();
}

// Buscar tarefas manuais do usuário
async function getManualTasks(
  userId: string,
  start?: string,
  end?: string,
): Promise<StudyTask[]> {
  let query = supabase
    .from(PLANNER_TASKS_TABLE)
    .select('*')
    .eq('user_id', userId);

  if (start) {
    query = query.gte('scheduled_date', start);
  }
  if (end) {
    query = query.lte('scheduled_date', end);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar tarefas manuais: ${error.message}`);
  }

  return (data || []).map(mapDatabaseToStudyTask);
}

// Mapear dados do banco para StudyTask
function mapDatabaseToStudyTask(dbData: any): StudyTask {
  return {
    id: dbData.id,
    userId: dbData.user_id,
    type: dbData.type,
    title: dbData.title,
    description: dbData.description,
    scheduledDate: dbData.scheduled_date,
    status: dbData.status,
    relatedQuestionIds: dbData.related_question_ids,
    priority: dbData.priority,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
    source: dbData.source,
    manualType: dbData.manual_type,
    targetUrl: dbData.target_url,
    metadata: dbData.metadata,
  };
}

// Mapear StudyTask para dados do banco
function mapStudyTaskToDatabase(task: StudyTask): any {
  return {
    id: task.id,
    user_id: task.userId,
    type: task.type,
    title: task.title,
    description: task.description,
    scheduled_date: task.scheduledDate,
    status: task.status,
    related_question_ids: task.relatedQuestionIds,
    priority: task.priority,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    source: task.source,
    manual_type: task.manualType,
    target_url: task.targetUrl,
    metadata: task.metadata,
  };
}

export async function getPlannerTasks(req: Request, res: Response) {
  const { userId, start, end } = req.query;
  if (!userId) {
return res.status(400).json({ error: 'userId obrigatório' });
}

  try {
    // ✅ OTIMIZAÇÃO: Reduzir limite para evitar consultas massivas
    const fsrsReviews = await unifiedReviewService.getFutureReviews(
      userId as string,
      200,
    );

    // Filtrar revisões FSRS pelo período solicitado
    let filteredReviews = fsrsReviews;
    if (start || end) {
      filteredReviews = fsrsReviews.filter((item) => {
        const itemDate = toISO(item.due).slice(0, 10);
        if (start && itemDate < start) {
return false;
}
        if (end && itemDate > end) {
return false;
}
        return true;
      });
    }

    // Agrupar flashcards por data e tipo de conteúdo
    const reviewsByDate = new Map<
      string,
      { flashcards: number; questions: number; items: any[] }
    >();

    filteredReviews.forEach((item) => {
      const date = toISO(item.due).slice(0, 10);
      if (!reviewsByDate.has(date)) {
        reviewsByDate.set(date, { flashcards: 0, questions: 0, items: [] });
      }
      const dateGroup = reviewsByDate.get(date)!;
      dateGroup.items.push(item);

      if (item.content_type === 'FLASHCARD') {
        dateGroup.flashcards++;
      } else if (item.content_type === 'QUESTION') {
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
            reviewIds: group.items
              .filter((item) => item.content_type === 'FLASHCARD')
              .map((item) => item.id),
          },
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
            reviewIds: group.items
              .filter((item) => item.content_type === 'QUESTION')
              .map((item) => item.id),
          },
        });
      }
    });

    const recommendationTasks: StudyTask[] = [];

    // 3. Buscar tarefas manuais reais
    const manualTasks: StudyTask[] = await getManualTasks(
      userId as string,
      start as string,
      end as string,
    );

    // 4. Unificar tudo
    const allTasks = [...fsrsTasks, ...recommendationTasks, ...manualTasks];
    return res.json(allTasks);
  } catch (error) {
    console.error('Erro ao buscar tarefas do planner:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function createTask(req: Request, res: Response) {
  const {
    userId,
    title,
    description,
    scheduledDate,
    manualType,
    targetUrl,
    metadata,
    priority,
  } = req.body;
  if (!userId || !title || !scheduledDate) {
    return res
      .status(400)
      .json({ error: 'userId, title e scheduledDate são obrigatórios' });
  }

  try {
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
      metadata,
    };

    const dbData = mapStudyTaskToDatabase(task);
    const { error } = await supabase.from(PLANNER_TASKS_TABLE).insert(dbData);

    if (error) {
      throw new Error(`Erro ao criar tarefa: ${error.message}`);
    }

    return res.status(201).json(task);
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function updateTask(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;
  if (!id) {
return res.status(400).json({ error: 'id obrigatório' });
}

  try {
    // Verificar se a tarefa existe
    const { data: existingTask, error: fetchError } = await supabase
      .from(PLANNER_TASKS_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existingTask) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const updatedAt = new Date().toISOString();
    const updateData = {
      ...updates,
      updated_at: updatedAt,
    };

    // Converter campos se necessário
    if (updates.userId) {
      updateData.user_id = updates.userId;
    }
    if (updates.scheduledDate) {
      updateData.scheduled_date = updates.scheduledDate;
    }
    if (updates.relatedQuestionIds) {
      updateData.related_question_ids = updates.relatedQuestionIds;
    }
    if (updates.createdAt) {
      updateData.created_at = updates.createdAt;
    }
    if (updates.manualType) {
      updateData.manual_type = updates.manualType;
    }
    if (updates.targetUrl) {
      updateData.target_url = updates.targetUrl;
    }

    const { data, error } = await supabase
      .from(PLANNER_TASKS_TABLE)
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao atualizar tarefa: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: 'Tarefa não encontrada após atualização' });
    }

    const updatedTask = mapDatabaseToStudyTask(data);
    return res.json(updatedTask);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function deleteTask(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
return res.status(400).json({ error: 'id obrigatório' });
}

  try {
    const { error } = await supabase
      .from(PLANNER_TASKS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar tarefa: ${error.message}`);
    }

    return res.json({ message: 'Tarefa deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tarefa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
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
  createdAt: string;
  updatedAt: string;
}

interface UserProgress {
  userId: string;
  totalStudyTime: number;
  questionsAnswered: number;
  accuracy: number;
  weakAreas: string[];
  strongAreas: string[];
  lastActivity: string;
}

export class SupabasePlannerService {
  constructor() {
    // Simplified constructor without retention service dependency
  }

  async createStudyPlan(userId: string): Promise<StudyPlan> {
    try {
      // Criar plano simplificado sem dependência de retention
      const plan: StudyPlan = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        name: 'Plano Personalizado',
        description: 'Plano gerado automaticamente',
        schedule: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return plan;
    } catch (error) {
      console.error('Erro ao criar plano de estudos:', error);
      throw new Error('Erro ao criar plano de estudos');
    }
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      // Implementação mock
      return {
        userId,
        totalStudyTime: 0,
        questionsAnswered: 0,
        accuracy: 0,
        weakAreas: [],
        strongAreas: [],
        lastActivity: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erro ao obter progresso do usuário:', error);
      throw new Error('Erro ao obter progresso do usuário');
    }
  }
}
