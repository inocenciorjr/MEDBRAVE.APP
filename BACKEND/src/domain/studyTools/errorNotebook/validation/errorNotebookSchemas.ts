import Joi from 'joi';

// Esquema para criar um novo caderno de erros
export const createErrorNotebookSchema = Joi.object({
  title: Joi.string().required().trim().min(3).max(100).messages({
    'string.base': 'O título deve ser um texto',
    'string.empty': 'O título não pode estar vazio',
    'string.min': 'O título deve ter pelo menos {#limit} caracteres',
    'string.max': 'O título não pode ter mais de {#limit} caracteres',
    'any.required': 'O título é obrigatório',
  }),
  description: Joi.string().trim().allow('').max(500).messages({
    'string.base': 'A descrição deve ser um texto',
    'string.max': 'A descrição não pode ter mais de {#limit} caracteres',
  }),
  isPublic: Joi.boolean().default(false).messages({
    'boolean.base': 'O campo isPublic deve ser um booleano',
  }),
  tags: Joi.array().items(Joi.string().trim()).default([]).messages({
    'array.base': 'Tags deve ser um array de strings',
  }),
});

// Esquema para atualizar um caderno de erros
export const updateErrorNotebookSchema = Joi.object({
  title: Joi.string().trim().min(3).max(100).messages({
    'string.base': 'O título deve ser um texto',
    'string.empty': 'O título não pode estar vazio',
    'string.min': 'O título deve ter pelo menos {#limit} caracteres',
    'string.max': 'O título não pode ter mais de {#limit} caracteres',
  }),
  description: Joi.string().trim().allow('').max(500).messages({
    'string.base': 'A descrição deve ser um texto',
    'string.max': 'A descrição não pode ter mais de {#limit} caracteres',
  }),
  isPublic: Joi.boolean().messages({
    'boolean.base': 'O campo isPublic deve ser um booleano',
  }),
  tags: Joi.array().items(Joi.string().trim()).messages({
    'array.base': 'Tags deve ser um array de strings',
  }),
});

// Esquema para listar cadernos de erros com paginação e filtros
export const listErrorNotebooksSchema = Joi.object({
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
  lastDocId: Joi.string().trim().messages({
    'string.base': 'lastDocId deve ser uma string',
  }),
  search: Joi.string().trim().allow('').messages({
    'string.base': 'Termo de busca deve ser uma string',
  }),
  tags: Joi.array().items(Joi.string().trim()).messages({
    'array.base': 'Tags deve ser um array de strings',
  }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'title', 'entryCount', 'lastEntryAt')
    .default('createdAt')
    .messages({
      'string.base': 'Campo de ordenação deve ser uma string',
      'any.only':
        'Campo de ordenação deve ser um dos seguintes: createdAt, updatedAt, title, entryCount, lastEntryAt',
    }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'string.base': 'Ordem de classificação deve ser uma string',
    'any.only': "Ordem de classificação deve ser 'asc' ou 'desc'",
  }),
});
