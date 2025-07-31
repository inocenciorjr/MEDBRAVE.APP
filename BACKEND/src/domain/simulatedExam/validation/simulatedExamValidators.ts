import { z } from 'zod';
import { SimulatedExamDifficulty, SimulatedExamStatus } from '../types';

// Schema para validar a criação de Simulado
export const createSimulatedExamSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  instructions: z.string().optional(),
  timeLimit: z.number().min(1, 'O tempo limite deve ser de pelo menos 1 minuto'),
  questions: z
    .array(
      z.object({
        questionId: z.string(),
        order: z.number().int().min(0),
        points: z.number().min(0, 'A pontuação deve ser maior ou igual a zero'),
      }),
    )
    .min(1, 'O simulado deve ter pelo menos uma questão'),
  difficulty: z.enum([
    SimulatedExamDifficulty.EASY,
    SimulatedExamDifficulty.MEDIUM,
    SimulatedExamDifficulty.HARD,
    SimulatedExamDifficulty.MIXED,
  ]),
  filterIds: z.array(z.string()).optional(),
  subFilterIds: z.array(z.string()).optional(),
  status: z
    .enum([SimulatedExamStatus.DRAFT, SimulatedExamStatus.PUBLISHED, SimulatedExamStatus.ARCHIVED])
    .optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  startMessage: z.string().optional(),
  endMessage: z.string().optional(),
  randomize: z.boolean().optional(),
});

// Schema para validar a atualização de Simulado
export const updateSimulatedExamSchema = createSimulatedExamSchema.partial();

// Schema para validar o início de um Simulado
export const startSimulatedExamSchema = z.object({
  examId: z.string(),
});

// Schema para validar o envio de uma resposta
export const submitAnswerSchema = z.object({
  resultId: z.string(),
  questionId: z.string(),
  answerId: z.string(),
  timeSpent: z.number().optional(),
});

// Schema para validar a finalização de um Simulado
export const finishSimulatedExamSchema = z.object({
  resultId: z.string(),
});

// Schema para validar a listagem de Simulados
export const listSimulatedExamsSchema = z.object({
  limit: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
  page: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
  status: z
    .enum([SimulatedExamStatus.DRAFT, SimulatedExamStatus.PUBLISHED, SimulatedExamStatus.ARCHIVED])
    .optional(),
  difficulty: z
    .enum([
      SimulatedExamDifficulty.EASY,
      SimulatedExamDifficulty.MEDIUM,
      SimulatedExamDifficulty.HARD,
      SimulatedExamDifficulty.MIXED,
    ])
    .optional(),
  createdBy: z.string().optional(),
  filterIds: z.union([z.string(), z.array(z.string())]).optional(),
  subFilterIds: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  isPublic: z
    .enum(['true', 'false'])
    .transform(val => val === 'true')
    .optional(),
  query: z.string().optional(),
  startAfter: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
});
