const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'domain', 'studyTools', 'flashcards', 'use-cases', 'CreateFlashcardUseCase.ts');
const backupPath = filePath + '.backup-manual';

// Template limpo para CreateFlashcardUseCase
const cleanTemplate = `import { IFlashcardRepository } from '../repositories/IFlashcardRepository';
import {
  Flashcard,
  CreateFlashcardDTO,
  FlashcardStatus,
} from '../types/flashcard.types';

export class CreateFlashcardUseCase {
  constructor(private flashcardRepository: IFlashcardRepository) {}

  async execute(data: CreateFlashcardDTO): Promise<Flashcard> {
    // Validar dados de entrada
    if (!data.deckId) {
      throw new Error('DeckId é obrigatório');
    }

    if (!data.front || !data.back) {
      throw new Error('Front e back são obrigatórios');
    }

    // Criar flashcard
    const flashcard: Flashcard = {
      id: '', // Será gerado pelo repositório
      deckId: data.deckId,
      front: data.front,
      back: data.back,
      status: FlashcardStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: data.tags || [],
      difficulty: data.difficulty || 'medium',
      lastReviewed: null,
      nextReview: null,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0
    };

    // Salvar no repositório
    return await this.flashcardRepository.create(flashcard);
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
  console.log('✅ CreateFlashcardUseCase.ts reconstruído com sucesso!');
  
} catch (error) {
  console.error('❌ Erro ao corrigir arquivo:', error.message);
  process.exit(1);
}