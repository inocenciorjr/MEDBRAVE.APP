/**
 * Entidade base que contém propriedades comuns a todas as entidades
 */
export interface BaseEntity {
  id: string;           // Identificador único
  createdAt: Date;      // Data de criação
  updatedAt: Date;      // Data da última atualização
} 