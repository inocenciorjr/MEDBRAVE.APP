import { Request, Response } from 'express';
import { deckService } from '../services/deckService';
import { FirebaseFlashcardRepository } from '../../../../infra/repositories/firebase/FirebaseFlashcardRepository';
import { handleServiceError } from '../../../../utils/errorHandler';
import { validateSchema } from '../../../../utils/validation';
import {
  createDeckSchema,
  updateDeckSchema,
  listDecksSchema,
} from '../validation/deckSchemas';

export class DeckController {
  private flashcardRepository: FirebaseFlashcardRepository;

  constructor() {
    this.flashcardRepository = new FirebaseFlashcardRepository();
  }
  async createDeck(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const payload = {
        ...req.body,
        userId,
      };

      const { isValid, error } = validateSchema(createDeckSchema, payload);
      if (!isValid) {
        res.status(400).json({ message: 'Dados inválidos', errors: error });
        return;
      }

      const deck = await deckService.createDeck(payload);
      res.status(201).json(deck);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async getDeckById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      // Usar flashcardRepository.getDeckById que retorna DeckWithCards
      const deckWithCards = await this.flashcardRepository.getDeckById(id, userId);

      if (!deckWithCards) {
        res.status(404).json({ message: 'Deck não encontrado' });
        return;
      }

      // Verificar se o usuário tem permissão para acessar o deck
      if (deckWithCards.userId !== userId && !deckWithCards.isPublic) {
        res.status(403).json({ message: 'Acesso negado ao deck' });
        return;
      }

      res.status(200).json(deckWithCards);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async updateDeck(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const { isValid, error } = validateSchema(updateDeckSchema, req.body);
      if (!isValid) {
        res.status(400).json({ message: 'Dados inválidos', errors: error });
        return;
      }

      const updatedDeck = await deckService.updateDeck(id, userId, req.body);

      if (!updatedDeck) {
        res.status(404).json({ message: 'Deck não encontrado' });
        return;
      }

      res.status(200).json(updatedDeck);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async deleteDeck(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      await deckService.deleteDeck(id, userId);
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async listDecks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const { isValid, error, value } = validateSchema(listDecksSchema, req.query);
      if (!isValid) {
        res.status(400).json({ message: 'Parâmetros de consulta inválidos', errors: error });
        return;
      }

      const options = {
        ...(value && typeof value === 'object' ? value : {}),
        userId,
      };

      const result = await deckService.listDecks(options);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async toggleFavoriteDeck(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const result = await deckService.toggleFavoriteDeck(id, userId);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async getFavoriteDecks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const { isValid, error, value } = validateSchema(listDecksSchema, req.query);
      if (!isValid) {
        res.status(400).json({ message: 'Parâmetros de consulta inválidos', errors: error });
        return;
      }

      const result = await deckService.getFavoriteDecks(userId, value as any);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async listPublicDecks(req: Request, res: Response): Promise<void> {
    try {
      const { isValid, error, value } = validateSchema(listDecksSchema, req.query);
      if (!isValid) {
        res.status(400).json({ message: 'Parâmetros de consulta inválidos', errors: error });
        return;
      }

      const options = {
        ...(value && typeof value === 'object' ? value : {}),
        isPublic: true,
      };

      const result = await deckService.listDecks(options);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async toggleDeckVisibility(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const result = await deckService.toggleDeckVisibility(id, userId);
      
      if (!result) {
        res.status(404).json({ message: 'Deck não encontrado' });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async getAvailableTags(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const tags = await deckService.getAvailableTags(userId);
      res.status(200).json(tags);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const stats = await deckService.getUserStats(userId);
      res.status(200).json(stats);
    } catch (error) {
      handleServiceError(error, res);
    }
  }

  async searchDecks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Usuário não autenticado' });
        return;
      }

      const searchParams = {
        ...req.query,
        userId
      };

      const result = await deckService.searchDecks(searchParams);
      res.status(200).json(result);
    } catch (error) {
      handleServiceError(error, res);
    }
  }
}

export const deckController = new DeckController();
