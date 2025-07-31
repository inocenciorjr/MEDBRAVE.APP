import Joi from 'joi';

/**
 * Valida dados com base em um esquema Joi
 * @param schema Esquema Joi para validação
 * @param data Dados a serem validados
 * @returns Objeto contendo o resultado da validação, erros (se houver) e o valor validado
 */
export const validateSchema = <T>(
  schema: Joi.Schema,
  data: any,
): {
  isValid: boolean;
  error?: Record<string, string>;
  value?: T;
} => {
  const validation = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (validation.error) {
    const errorDetails: Record<string, string> = {};

    validation.error.details.forEach(detail => {
      const path = detail.path.join('.');
      errorDetails[path] = detail.message;
    });

    return {
      isValid: false,
      error: errorDetails,
    };
  }

  return {
    isValid: true,
    value: validation.value as T,
  };
};
