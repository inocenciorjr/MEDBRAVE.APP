import Joi from 'joi';
import { ErrorSourceType } from '../types';

// Esquema para criar uma nova entrada no caderno de erros
export const createErrorEntrySchema = Joi.object({
  notebookId: Joi.string().required().trim().messages({
    'string.base': 'ID do caderno de erros deve ser uma string',
    'string.empty': 'ID do caderno de erros não pode estar vazio',
    'any.required': 'ID do caderno de erros é obrigatório',
  }),
  sourceType: Joi.string()
    .valid(...Object.values(ErrorSourceType))
    .required()
    .messages({
      'string.base': 'Tipo de fonte deve ser uma string',
      'any.only':
        'Tipo de fonte deve ser um dos seguintes: QUESTION, FLASHCARD, SIMULATION, CUSTOM',
      'any.required': 'Tipo de fonte é obrigatório',
    }),
  sourceId: Joi.string()
    .trim()
    .allow(null)
    .when('sourceType', {
      is: Joi.valid(
        ErrorSourceType.QUESTION,
        ErrorSourceType.FLASHCARD,
      ),
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.base': 'ID da fonte deve ser uma string',
      'string.empty': 'ID da fonte não pode estar vazio',
      'any.required': 'ID da fonte é obrigatório para este tipo de fonte',
    }),
  errorDescription: Joi.string().trim().min(3).max(1000).default('').messages({
    'string.base': 'Descrição do erro deve ser uma string',
    'string.min': 'Descrição do erro deve ter pelo menos {#limit} caracteres',
    'string.max': 'Descrição do erro não pode ter mais de {#limit} caracteres',
  }),
  errorCategory: Joi.string().trim().max(100).allow(null).default(null).messages({
    'string.base': 'Categoria do erro deve ser uma string',
    'string.max': 'Categoria do erro não pode ter mais de {#limit} caracteres',
  }),
  userAnswer: Joi.string().trim().max(1000).allow(null).default(null).messages({
    'string.base': 'Resposta do usuário deve ser uma string',
    'string.max': 'Resposta do usuário não pode ter mais de {#limit} caracteres',
  }),
  correctAnswer: Joi.string().trim().max(1000).allow(null).default(null).messages({
    'string.base': 'Resposta correta deve ser uma string',
    'string.max': 'Resposta correta não pode ter mais de {#limit} caracteres',
  }),
  personalNotes: Joi.string().trim().max(2000).default('').messages({
    'string.base': 'Notas pessoais deve ser uma string',
    'string.max': 'Notas pessoais não pode ter mais de {#limit} caracteres',
  }),
  isResolved: Joi.boolean().default(false).messages({
    'boolean.base': 'Status de resolução deve ser um booleano',
  }),
  tags: Joi.array().items(Joi.string().trim().max(50)).default([]).messages({
    'array.base': 'Tags deve ser um array de strings',
    'string.max': 'Cada tag não pode ter mais de {#limit} caracteres',
  }),
});

// Esquema para atualizar uma entrada
export const updateErrorEntrySchema = Joi.object({
  errorDescription: Joi.string().trim().min(3).max(1000).messages({
    'string.base': 'Descrição do erro deve ser uma string',
    'string.min': 'Descrição do erro deve ter pelo menos {#limit} caracteres',
    'string.max': 'Descrição do erro não pode ter mais de {#limit} caracteres',
  }),
  errorCategory: Joi.string().trim().max(100).allow(null).messages({
    'string.base': 'Categoria do erro deve ser uma string',
    'string.max': 'Categoria do erro não pode ter mais de {#limit} caracteres',
  }),
  userAnswer: Joi.string().trim().max(1000).allow(null).messages({
    'string.base': 'Resposta do usuário deve ser uma string',
    'string.max': 'Resposta do usuário não pode ter mais de {#limit} caracteres',
  }),
  correctAnswer: Joi.string().trim().max(1000).allow(null).messages({
    'string.base': 'Resposta correta deve ser uma string',
    'string.max': 'Resposta correta não pode ter mais de {#limit} caracteres',
  }),
  personalNotes: Joi.string().trim().max(2000).messages({
    'string.base': 'Notas pessoais deve ser uma string',
    'string.max': 'Notas pessoais não pode ter mais de {#limit} caracteres',
  }),
  isResolved: Joi.boolean().messages({
    'boolean.base': 'Status de resolução deve ser um booleano',
  }),
  tags: Joi.array().items(Joi.string().trim().max(50)).messages({
    'array.base': 'Tags deve ser um array de strings',
    'string.max': 'Cada tag não pode ter mais de {#limit} caracteres',
  }),
});

// Esquema para listar entradas com paginação e filtros
export const listErrorEntriesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limite deve ser um número',
    'number.integer': 'Limite deve ser um número inteiro',
    'number.min': 'Limite deve ser pelo menos {#limit}',
    'number.max': 'Limite não pode ser maior que {#limit}',
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Página deve ser um número',
    'number.integer': 'Página deve ser um número inteiro',
    'number.min': 'Página deve ser pelo menos {#limit}',
  }),
  isResolved: Joi.boolean().messages({
    'boolean.base': 'Status de resolução deve ser um booleano',
  }),
  category: Joi.string().trim().messages({
    'string.base': 'Categoria deve ser uma string',
  }),
  search: Joi.string().trim().allow('').messages({
    'string.base': 'Termo de busca deve ser uma string',
  }),
  tags: Joi.array().items(Joi.string().trim()).messages({
    'array.base': 'Tags deve ser um array de strings',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'errorCategory', 'isResolved', 'nextReviewAt')
    .default('createdAt')
    .messages({
      'string.base': 'Campo de ordenação deve ser uma string',
      'any.only':
        'Campo de ordenação deve ser um dos seguintes: createdAt, updatedAt, errorCategory, isResolved, nextReviewAt',
    }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'string.base': 'Ordem de classificação deve ser uma string',
    'any.only': "Ordem de classificação deve ser 'asc' ou 'desc'",
  }),
});

// Esquema para registrar revisão de uma entrada
export const recordEntryReviewSchema = Joi.object({
  grade: Joi.number().integer().valid(1,2,3,4).required().messages({
    'number.base': 'Nota da revisão deve ser um número',
    'number.integer': 'Nota da revisão deve ser um número inteiro',
    'any.only': 'Nota deve ser 1 (AGAIN), 2 (HARD), 3 (GOOD) ou 4 (EASY)',
    'any.required': 'Nota da revisão é obrigatória',
  }),
  notes: Joi.string().trim().max(2000).allow('').messages({
    'string.base': 'Notas deve ser uma string',
    'string.max': 'Notas não pode ter mais de {#limit} caracteres',
  }),
});

// Esquema para importar de uma questão ou flashcard
export const importFromSourceSchema = Joi.object({
  responseId: Joi.string().trim().messages({
    'string.base': 'ID da resposta deve ser uma string',
    'string.empty': 'ID da resposta não pode estar vazio',
  }),
  interactionId: Joi.string().trim().messages({
    'string.base': 'ID da interação deve ser uma string',
    'string.empty': 'ID da interação não pode estar vazio',
  }),
  notebookId: Joi.string().required().trim().messages({
    'string.base': 'ID do caderno de erros deve ser uma string',
    'string.empty': 'ID do caderno de erros não pode estar vazio',
    'any.required': 'ID do caderno de erros é obrigatório',
  }),
  additionalData: Joi.object({
    errorCategory: Joi.string().trim().max(100).allow(null).messages({
      'string.base': 'Categoria do erro deve ser uma string',
      'string.max': 'Categoria do erro não pode ter mais de {#limit} caracteres',
    }),
    personalNotes: Joi.string().trim().max(2000).allow('').messages({
      'string.base': 'Notas pessoais deve ser uma string',
      'string.max': 'Notas pessoais não pode ter mais de {#limit} caracteres',
    }),
    tags: Joi.array().items(Joi.string().trim().max(50)).messages({
      'array.base': 'Tags deve ser um array de strings',
      'string.max': 'Cada tag não pode ter mais de {#limit} caracteres',
    }),
  })
    .default({})
    .messages({
      'object.base': 'Dados adicionais deve ser um objeto',
    }),
})
  .xor('responseId', 'interactionId')
  .messages({
    'object.xor': 'Deve fornecer ou um ID de resposta ou um ID de interação, mas não ambos',
  });
