import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import { AppError } from '../../../../shared/errors/AppError';

export class DeleteFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(id: string, user_id: string): Promise<void> {
    // Validar parâmetros
    if (!id) {
      throw new AppError('Flashcard ID is required');
    }

    if (!user_id) {
      throw new AppError('User ID is required');
    }

    // Verificar se o flashcard existe
    const existingFlashcard = await this.flashcardRepository.findById(id);

    if (!existingFlashcard) {
      throw new AppError('Flashcard not found', 404);
    }

    // Verificar se o usuário pode EDITAR o deck (deve ser o dono)
    if (existingFlashcard.deck_id) {
      const canEdit = await this.flashcardRepository.canEditDeck(existingFlashcard.deck_id, user_id);
      if (!canEdit) {
        // Retornar 404 ao invés de 403 para não revelar que o flashcard existe
        throw new AppError('Flashcard not found', 404);
      }
    }

    // Deletar imagens do R2 se existirem
    try {
      const { R2Service } = await import('../../../../services/r2Service');
      const r2Service = new R2Service();

      // Extrair URLs de imagens do HTML (front e back)
      const imageUrls: string[] = [];
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      
      let match;
      while ((match = imgRegex.exec(existingFlashcard.front_content)) !== null) {
        imageUrls.push(match[1]);
      }
      while ((match = imgRegex.exec(existingFlashcard.back_content)) !== null) {
        imageUrls.push(match[1]);
      }

      // Deletar imagens do R2 (apenas as que estão no R2)
      for (const url of imageUrls) {
        if (url.includes('medbrave.com.br') && !url.includes('/medbravethumb.png')) {
          try {
            const key = url.split('medbrave.com.br/')[1];
            if (key) {
              await r2Service.deleteFile(key);
              console.log(`🗑️ [DeleteFlashcard] Imagem removida do R2: ${key}`);
            }
          } catch (deleteError) {
            console.error('⚠️ [DeleteFlashcard] Erro ao deletar imagem:', deleteError);
            // Continuar mesmo se falhar
          }
        }
      }
    } catch (error) {
      console.error('⚠️ [DeleteFlashcard] Erro ao processar imagens:', error);
      // Continuar com a deleção do flashcard
    }

    // Excluir flashcard
    await this.flashcardRepository.delete(id);

    // O repositório já deve atualizar as estatísticas do deck automaticamente
  }
}
