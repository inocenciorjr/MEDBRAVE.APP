const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'domain', 'studyTools', 'flashcards', 'controllers', 'deckController.ts');
const backupPath = filePath + '.backup-manual';

// Template limpo para deckController
const cleanTemplate = `import { Request, Response } from 'express';
import { IDeckRepository } from '../repositories/IDeckRepository';
import {
  Deck,
  CreateDeckDTO,
  UpdateDeckDTO,
  DeckStatus,
} from '../types/deck.types';

export class DeckController {
  constructor(private deckRepository: IDeckRepository) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateDeckDTO = req.body;
      
      if (!data.name) {
        res.status(400).json({ error: 'Nome do deck é obrigatório' });
        return;
      }

      const deck: Deck = {
        id: '', // Será gerado pelo repositório
        name: data.name,
        description: data.description || '',
        userId: req.user?.id || '',
        status: DeckStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        flashcardCount: 0,
        tags: data.tags || [],
        isPublic: data.isPublic || false
      };

      const createdDeck = await this.deckRepository.create(deck);
      res.status(201).json(createdDeck);
    } catch (error) {
      console.error('Erro ao criar deck:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async findById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deck = await this.deckRepository.findById(id);
      
      if (!deck) {
        res.status(404).json({ error: 'Deck não encontrado' });
        return;
      }

      res.json(deck);
    } catch (error) {
      console.error('Erro ao buscar deck:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async findByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const decks = await this.deckRepository.findByUserId(userId);
      res.json(decks);
    } catch (error) {
      console.error('Erro ao buscar decks do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateDeckDTO = req.body;
      
      const updatedDeck = await this.deckRepository.update(id, data);
      
      if (!updatedDeck) {
        res.status(404).json({ error: 'Deck não encontrado' });
        return;
      }

      res.json(updatedDeck);
    } catch (error) {
      console.error('Erro ao atualizar deck:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.deckRepository.delete(id);
      
      if (!success) {
        res.status(404).json({ error: 'Deck não encontrado' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar deck:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const decks = await this.deckRepository.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string
      });
      res.json(decks);
    } catch (error) {
      console.error('Erro ao listar decks:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
`;

try {
  // Criar backup
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log('📁 Backup criado:', backupPath);
  }

  // Escrever template limpo
  fs.writeFileSync(filePath, cleanTemplate, 'utf8');
  console.log('✅ deckController.ts reconstruído com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao corrigir arquivo:', error.message);
  process.exit(1);
}