import { inject, injectable } from 'tsyringe';
import { IDeckRepository } from '../repositories/IDeckRepository';
import { Deck } from '../types';
import AppError from '../../../../utils/AppError';

function mapRepoDeckToDomain(deck: any): Deck {
  return {
    id: deck.id,
    userId: deck.userId,
    name: deck.name || deck.title,
    description: deck.description ?? null,
    isPublic: deck.isPublic,
    tags: deck.tags,
    coverImageUrl: deck.coverImageUrl || deck.imageUrl || null,
    status: deck.status as any,
    flashcardCount: deck.flashcardCount,
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt,
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
      imageUrl: sourceDeckDomain.coverImageUrl || undefined,
      visibility: (sourceDeck as any).visibility,
      isPublic: false, // Deck clonado é privado por padrão
    });

    // Mapear para o tipo Deck do domínio
    const newDeck = mapRepoDeckToDomain(created);

    // (Opcional: clonar flashcards aqui, se necessário)

    return newDeck;
  }
}
