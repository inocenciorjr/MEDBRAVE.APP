/**
 * Módulo de Ferramentas de Estudo (StudyTools)
 *
 * Este módulo oferece ferramentas para ajudar no estudo e aprendizado,
 * incluindo flashcards, sessões de estudo, cadernos de erros e revisões programáveis.
 */

// Factory principal
export { createStudyToolsModule } from './factories/createStudyToolsModule';

// Factories dos submódulos
export { createFlashcardModule } from './flashcards/factories/createFlashcardModule';
export { createStudySessionModule } from './studySessions/factories/createStudySessionModule';

// Nota: Para uso direto, recomenda-se usar as factories acima para criar módulos completos
// As rotas abaixo são mantidas para compatibilidade com código legado

import { Router } from 'express';
import { default as flashcardRoutes } from './flashcards/routes/deckRoutes';
import { createErrorNotebookModule } from './errorNotebook/factories/createErrorNotebookModule';

// Criar router agregando todas as rotas disponíveis
const router = Router();
router.use('/flashcards', flashcardRoutes);

const errorNotebookModule = createErrorNotebookModule();
router.use('/notebooks', errorNotebookModule.errorNotebookRoutes);
// Não registramos as rotas de sessões de estudo diretamente porque elas precisam de um controlador

export default router;
