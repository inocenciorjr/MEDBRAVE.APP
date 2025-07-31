import * as Joi from 'joi';
import { FlashcardStatus } from '../types/flashcard.types';

const createFlashcardSchema = Joi.object({
  deckId: Joi.string().required(),
  frontContent: Joi.string().required().min(1).max(10000),
  backContent: Joi.string().required().min(1).max(10000),
  personalNotes: Joi.string().allow('').max(10000),
  tags: Joi.array().items(Joi.string()),
  mediaUrls: Joi.array().items(Joi.string().uri()),
  metadata: Joi.object(),
});

const updateFlashcardSchema = Joi.object({
  frontContent: Joi.string().min(1).max(10000),
  backContent: Joi.string().min(1).max(10000),
  personalNotes: Joi.string().allow('').max(10000),
  tags: Joi.array().items(Joi.string()),
  status: Joi.string().valid(...Object.values(FlashcardStatus)),
  mediaUrls: Joi.array().items(Joi.string().uri()),
  metadata: Joi.object(),
});

const reviewFlashcardSchema = Joi.object({
  reviewQuality: Joi.number().integer().min(0).max(3).required(),
});

const schemas = {
  createFlashcard: createFlashcardSchema,
  updateFlashcard: updateFlashcardSchema,
  reviewFlashcard: reviewFlashcardSchema,
};

type SchemaType = keyof typeof schemas;

export const validate = (schema: SchemaType, data: unknown) => {
  const validationSchema = schemas[schema];
  return validationSchema.validate(data, { abortEarly: false });
};
