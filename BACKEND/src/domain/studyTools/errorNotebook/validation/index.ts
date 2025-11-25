import Joi from 'joi';
import {
  createErrorNotebookSchema,
  updateErrorNotebookSchema,
  listErrorNotebooksSchema,
} from './errorNotebookSchemas';
import {
  createErrorEntrySchema,
  updateErrorEntrySchema,
  listErrorEntriesSchema,
  recordEntryReviewSchema,
} from './errorNotebookEntrySchemas';

// Dictionary of all schemas
const schemas = {
  // ErrorNotebook schemas
  createErrorNotebook: createErrorNotebookSchema,
  updateErrorNotebook: updateErrorNotebookSchema,
  listErrorNotebooks: listErrorNotebooksSchema,

  // ErrorNotebookEntry schemas
  createErrorEntry: createErrorEntrySchema,
  updateErrorEntry: updateErrorEntrySchema,
  listErrorEntries: listErrorEntriesSchema,
  recordEntryReview: recordEntryReviewSchema,
};

export type SchemaType = keyof typeof schemas;

/**
 * Validate data against a schema
 * @param schemaName The name of the schema to validate against
 * @param data The data to validate
 * @returns The validation result with error and valid data
 */
export const validateSchema = (
  schemaName: SchemaType,
  data: unknown,
): Joi.ValidationResult => {
  const schema = schemas[schemaName];
  return schema.validate(data, { abortEarly: false });
};
