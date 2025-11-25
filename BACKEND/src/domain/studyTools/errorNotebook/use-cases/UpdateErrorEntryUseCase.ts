import { IErrorNotebookEntryRepository } from '../repositories/IErrorNotebookEntryRepository';
import { ErrorNotebookEntry, UpdateErrorEntryPayload } from '../types';
import { AppError } from '../../../../shared/errors/AppError';

export class UpdateErrorEntryUseCase {
  constructor(
    private errorNotebookEntryRepository: IErrorNotebookEntryRepository,
  ) {}

  async execute(
    id: string,
    userId: string,
    data: UpdateErrorEntryPayload,
  ): Promise<ErrorNotebookEntry> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Entry ID is required');
    }

    if (!userId) {
      throw new AppError('User ID is required');
    }

    // Verificar se há dados para atualização
    if (Object.keys(data).length === 0) {
      throw new AppError('No data provided for update');
    }

    // Verificar se a entrada existe
    const existingEntry = await this.errorNotebookEntryRepository.findById(id);

    if (!existingEntry) {
      throw new AppError('Error notebook entry not found', 404);
    }

    // Verificar se a entrada pertence ao usuário
    if (existingEntry.user_id !== userId) {
      throw new AppError('Unauthorized access to error notebook entry', 403);
    }

    // Preparar dados para atualização, fazendo trim dos campos de texto
    const updateData: UpdateErrorEntryPayload = { ...data };
    if (data.user_note) {
      updateData.user_note = data.user_note.trim();
    }
    if (data.user_explanation) {
      updateData.user_explanation = data.user_explanation.trim();
    }

    // Atualizar entrada
    const updatedEntry = await this.errorNotebookEntryRepository.update(
      id,
      userId,
      updateData,
    );

    if (!updatedEntry) {
      throw new AppError('Failed to update error notebook entry', 500);
    }

    return updatedEntry;
  }
}
