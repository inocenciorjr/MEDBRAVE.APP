import * as Joi from 'joi';
import { DeckStatus } from '../types';

/**
 * Esquema para validação de criação de baralho
 */
export const createDeckSchema = Joi.object({
  user_id: Joi.string().required().messages({
    'string.empty': 'O ID do usuário é obrigatório',
    'any.required': 'O ID do usuário é obrigatório',
  }),
  name: Joi.string().required().max(100).messages({
    'string.empty': 'O nome do baralho é obrigatório',
    'string.max': 'O nome do baralho deve ter no máximo {#limit} caracteres',
    'any.required': 'O nome do baralho é obrigatório',
  }),
  collection_id: Joi.string().allow(null, '').messages({
    'string.empty': 'O ID da coleção não pode ser vazio',
  }),
  description: Joi.string().allow(null, '').max(500).messages({
    'string.max': 'A descrição deve ter no máximo {#limit} caracteres',
  }),
  is_public: Joi.boolean().default(false),
  tags: Joi.array().items(Joi.string().max(30)).default([]).messages({
    'string.max': 'Cada tag deve ter no máximo {#limit} caracteres',
  }),
  cover_image_url: Joi.string().uri().allow(null, '').messages({
    'string.uri': 'A URL da imagem de capa deve ser válida',
  }),
  status: Joi.string()
    .valid(...Object.values(DeckStatus))
    .default(DeckStatus.ACTIVE)
    .messages({
      'any.only': 'O status deve ser um dos seguintes valores: {#valids}',
    }),
});

/**
 * Esquema para validação de atualização de baralho
 */
export const updateDeckSchema = Joi.object({
  name: Joi.string().max(100).messages({
    'string.empty': 'O nome do baralho não pode ser vazio',
    'string.max': 'O nome do baralho deve ter no máximo {#limit} caracteres',
  }),
  description: Joi.string().allow(null, '').max(500).messages({
    'string.max': 'A descrição deve ter no máximo {#limit} caracteres',
  }),
  is_public: Joi.boolean(),
  tags: Joi.array().items(Joi.string().max(30)).messages({
    'string.max': 'Cada tag deve ter no máximo {#limit} caracteres',
  }),
  cover_image_url: Joi.string().uri().allow(null, '').messages({
    'string.uri': 'A URL da imagem de capa deve ser válida',
  }),
  status: Joi.string()
    .valid(...Object.values(DeckStatus))
    .messages({
      'any.only': 'O status deve ser um dos seguintes valores: {#valids}',
    }),
});

/**
 * Esquema para validação de listagem de baralhos
 */
export const listDecksSchema = Joi.object({
  status: Joi.string().valid(...Object.values(DeckStatus)),
  tags: Joi.array().items(Joi.string()),
  search: Joi.string().max(100),
  sort_by: Joi.string().valid(
    'name',
    'created_at',
    'updated_at',
    'flashcard_count',
  ),
  sort_order: Joi.string().valid('ASC', 'DESC'),
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1),
  last_doc_id: Joi.string(),
});
