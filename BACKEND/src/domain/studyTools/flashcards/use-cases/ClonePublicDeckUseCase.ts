import { inject, injectable } from 'tsyringe';
import { IDeckRepository } from '../repositories/IDeckRepository';
import { Deck } from '../types';
import AppError from '../../../../utils/AppError';

function mapRepoDeckToDomain(deck: any): Deck {
  return {
    id: deck.id,
    user_id: deck.userId,
    name: deck.name || deck.title,
    description: deck.description ?? null,
    is_public: deck.isPublic,
    tags: deck.tags,
    cover_image_url: deck.coverImageUrl || deck.imageUrl || null,
    status: (deck.status as any) || 'ACTIVE',
    flashcard_count: deck.flashcardCount,
    created_at: deck.createdAt,
    updated_at: deck.updatedAt,
  };
}

@injectable()
export class ClonePublicDeckUseCase {
  constructor(
    @inject('DeckRepository')
    private deckRepository: IDeckRepository,
  ) {}

  async execute(deckId: string, userId: string): Promise<Deck> {
    const sourceDeck = await this.deckRepository.findById(deckId);
    if (!sourceDeck) {
      throw new AppError('Source deck not found', 404);
    }

    const sourceDeckDomain = mapRepoDeckToDomain(sourceDeck);

    // Cria um novo deck para o usuário, copiando os dados relevantes
    const created = await this.deckRepository.create({
      userId,
      title: sourceDeckDomain.name,
      description: sourceDeckDomain.description || '',
      tags: sourceDeckDomain.tags,
      imageUrl: sourceDeckDomain.cover_image_url || undefined,
      visibility: (sourceDeck as any).visibility,
      isPublic: false, // Deck clonado é privado por padrão
    });

    // Mapear para o tipo Deck do domínio
    const newDeck = mapRepoDeckToDomain(created);

    // (Opcional: clonar flashcards aqui, se necessário)

    return newDeck;
  }
}
