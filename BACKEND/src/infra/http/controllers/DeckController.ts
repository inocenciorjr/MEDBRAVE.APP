import { Request, Response } from 'express';
import { deckService } from '../../studyTools/supabase/SupabaseDeckService';

export class DeckController {
  async create(request: Request, response: Response): Promise<Response> {
    const { userId } = request;
    const { name, description, isPublic, tags, coverImageUrl, status } =
      request.body;

    const deck = await deckService.createDeck({
      user_id: userId,
      name,
      description,
      is_public: isPublic,
      tags,
      cover_image_url: coverImageUrl,
      status,
    });

    return response.status(201).json(deck);
  }

  async getPublic(request: Request, response: Response): Promise<Response> {
    const {
      tags,
      search,
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
    } = request.query;

    const options = {
      tags: tags
        ? ((Array.isArray(tags) ? tags : [tags]) as string[])
        : undefined,
      search: search as string | undefined,
      is_public: true,
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder
        ? (String(sortOrder).toUpperCase() as 'ASC' | 'DESC')
        : undefined,
    };
    const decks = await deckService.listDecks(options);
    return response.json(decks);
  }

  async clone(_request: Request, response: Response): Promise<Response> {
    return response
      .status(501)
      .json({ message: 'Clone de deck não implementado.' });
  }
}
