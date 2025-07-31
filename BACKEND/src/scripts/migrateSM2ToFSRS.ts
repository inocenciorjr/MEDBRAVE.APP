import { firestore } from '../config/firebaseAdmin';
import { FlashcardFSRSService } from '../domain/studyTools/flashcards/services/FlashcardFSRSService';
import logger from '../utils/logger';

/**
 * Script para migrar todos os flashcards existentes de SM-2 para FSRS
 * Execute: npm run migrate-fsrs
 */

const migrateSM2ToFSRS = async () => {
  const flashcardService = new FlashcardFSRSService();
  const db = firestore;

  try {
    logger.info('🚀 Iniciando migração SM-2 → FSRS...');

    // Buscar todos os flashcards
    const flashcardsSnapshot = await db.collection('flashcards').get();
    const totalFlashcards = flashcardsSnapshot.size;

    logger.info(`📊 Total de flashcards encontrados: ${totalFlashcards}`);

    let migratedCount = 0;
    let errorCount = 0;
    let alreadyMigratedCount = 0;

    for (const flashcardDoc of flashcardsSnapshot.docs) {
      const flashcard = flashcardDoc.data();
      const flashcardId = flashcardDoc.id;

      try {
        // Verifica se já existe card FSRS
        const existingFSRSCard = await db
          .collection('fsrs_cards')
          .where('contentId', '==', flashcardId)
          .where('userId', '==', flashcard.userId)
          .limit(1)
          .get();

        if (!existingFSRSCard.empty) {
          alreadyMigratedCount++;
          logger.info(`⏭️  Flashcard ${flashcardId} já migrado`);
          continue;
        }

        // Migra o flashcard
        await flashcardService.migrateFlashcardToFSRS(flashcardId, flashcard.userId);
        migratedCount++;

        if (migratedCount % 10 === 0) {
          logger.info(`📈 Progresso: ${migratedCount}/${totalFlashcards} migrados`);
        }

      } catch (error) {
        errorCount++;
        logger.error(`❌ Erro ao migrar flashcard ${flashcardId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    logger.info('✅ Migração concluída!');
    logger.info(`📊 Resumo:`);
    logger.info(`   • Migrados: ${migratedCount}`);
    logger.info(`   • Já existiam: ${alreadyMigratedCount}`);
    logger.info(`   • Erros: ${errorCount}`);
    logger.info(`   • Total: ${totalFlashcards}`);

  } catch (error) {
    logger.error(`💥 Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    process.exit(1);
  }

  process.exit(0);
};

// Executa o script se chamado diretamente
if (require.main === module) {
  migrateSM2ToFSRS();
}

export default migrateSM2ToFSRS; 