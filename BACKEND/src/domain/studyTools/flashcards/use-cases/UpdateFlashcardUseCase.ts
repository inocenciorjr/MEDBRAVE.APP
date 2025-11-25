import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { Flashcard, UpdateFlashcardDTO } from '../types/flashcard.types';
import { AppError } from '../../../../shared/errors/AppError';

export class UpdateFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(
    id: string,
    user_id: string,
    data: UpdateFlashcardDTO,
  ): Promise<Flashcard> {
    console.log('🔧 [UpdateFlashcardUseCase] Iniciando atualização:', { id, user_id, data });
    
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!user_id) {
      throw new AppError('User ID is required');
    }

    // Verificar se há dados para atualização
    if (Object.keys(data).length === 0) {
      throw new AppError('No data provided for update');
    }

    // Verificar se o flashcard existe
    console.log('🔧 [UpdateFlashcardUseCase] Buscando flashcard...');
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    console.log('🔧 [UpdateFlashcardUseCase] Flashcard encontrado:', { deck_id: existingFlashcard.deck_id });

    // Verificar se o usuário pode EDITAR o deck (deve ser o dono)
    if (existingFlashcard.deck_id) {
      console.log('🔧 [UpdateFlashcardUseCase] Verificando permissão de edição...');
      const canEdit = await this.flashcardRepository.canEditDeck(existingFlashcard.deck_id, user_id);
      if (!canEdit) {
        console.error('❌ [UpdateFlashcardUseCase] Usuário não é dono do deck');
        throw new AppError('Unauthorized: You are not the owner of this deck', 403);
      }
      console.log('✅ [UpdateFlashcardUseCase] Permissão de edição confirmada');
    }

    // Validar conteúdo do flashcard se fornecido
    if (data.front_content && !data.front_content.trim()) {
      throw new AppError('Front content cannot be empty');
    }

    if (data.back_content && !data.back_content.trim()) {
      throw new AppError('Back content cannot be empty');
    }

    // Atualizar flashcard
    console.log('🔧 [UpdateFlashcardUseCase] Atualizando flashcard no banco...');
    try {
      const updatedFlashcard = await this.flashcardRepository.update(id, data);
      console.log('✅ [UpdateFlashcardUseCase] Flashcard atualizado com sucesso');
      return updatedFlashcard;
    } catch (error: any) {
      console.error('❌ [UpdateFlashcardUseCase] Erro ao atualizar flashcard:', error);
      throw error;
    }
  }
}
