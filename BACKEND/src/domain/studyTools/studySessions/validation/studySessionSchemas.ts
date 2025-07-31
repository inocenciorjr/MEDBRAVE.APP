import Joi from 'joi';
import {
  StudySessionType,
  StudySessionMood,
  StudySessionDifficulty,
} from '../types/studySession.types';
import { ReviewQuality } from '../../flashcards/types/flashcard.types';

/**
 * Esquema para validação de criação de sessão de estudo
 */
const createStudySessionSchema = Joi.object({
  studyType: Joi.string()
    .valid(...Object.values(StudySessionType))
    .required(),
  startTime: Joi.date(),
  filters: Joi.object(),
  subFilters: Joi.object(),
});

/**
 * Esquema para validação de atualização de sessão de estudo
 */
const updateStudySessionSchema = Joi.object({
  endTime: Joi.date(),
  questionsAnswered: Joi.number().integer().min(0),
  correctAnswers: Joi.number().integer().min(0),
  incorrectAnswers: Joi.number().integer().min(0),
  notes: Joi.string().allow('', null),
  mood: Joi.string()
    .valid(...Object.values(StudySessionMood))
    .allow(null),
  difficulty: Joi.string()
    .valid(...Object.values(StudySessionDifficulty))
    .allow(null),
  focusScore: Joi.number().min(0).max(100).allow(null),
  isCompleted: Joi.boolean(),
});

/**
 * Esquema para validação de listagem de sessões de estudo
 */
export const listStudySessionsSchema = Joi.object({
  filters: Joi.object({
    studyType: Joi.string().valid(...Object.values(StudySessionType)),
    isCompleted: Joi.boolean(),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }).default({}),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string()
      .valid('startTime', 'endTime', 'createdAt', 'updatedAt')
      .default('startTime'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }).default({
    page: 1,
    limit: 10,
    sortBy: 'startTime',
    sortOrder: 'desc',
  }),
});

/**
 * Esquema para validação de registro de resposta em sessão de estudo
 */
const recordAnswerSchema = Joi.object({
  questionId: Joi.string().required(),
  isCorrect: Joi.boolean().required(),
  reviewQuality: Joi.number()
    .valid(...Object.values(ReviewQuality))
    .required(),
  selectedOptionId: Joi.string().allow(null),
  essayResponse: Joi.string().allow('', null),
  responseTimeSeconds: Joi.number().min(0),
  questionListId: Joi.string().allow(null),
});

const completeStudySessionSchema = Joi.object({
  endTime: Joi.date(),
  notes: Joi.string().allow('', null),
  mood: Joi.string().valid(...Object.values(StudySessionMood)),
  difficulty: Joi.string().valid(...Object.values(StudySessionDifficulty)),
  focusScore: Joi.number().min(0).max(100),
});

const schemas = {
  createStudySession: createStudySessionSchema,
  updateStudySession: updateStudySessionSchema,
  completeStudySession: completeStudySessionSchema,
  recordAnswer: recordAnswerSchema,
};

type SchemaType = keyof typeof schemas;

export const validate = (schema: SchemaType, data: unknown) => {
  const validationSchema = schemas[schema];
  return validationSchema.validate(data, { abortEarly: false });
};
