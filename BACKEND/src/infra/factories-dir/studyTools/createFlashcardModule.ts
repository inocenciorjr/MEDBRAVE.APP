import { FlashcardController } from '../../../domain/studyTools/flashcards/controllers/flashcardController';
import { createFlashcardRoutes } from '../../../domain/studyTools/flashcards/routes/flashcardRoutes';
import { SupabaseFlashcardRepository } from '../../studyTools/supabase/SupabaseFlashcardRepository';
import { supabase } from '../../../config/supabase';

export const createFlashcardModule = () => {
  // Criar repositório Supabase (recomendado)
  const flashcardRepository = new SupabaseFlashcardRepository(supabase);

  // Criar controlador
  const flashcardController = new FlashcardController(flashcardRepository);

  // Criar rotas
  const flashcardRoutes = createFlashcardRoutes(flashcardController);

  return {
    flashcardRoutes,
    flashcardRepository,
    flashcardController,
  };
};

 
