import { supabase } from '../config/supabase';
// FSRS migration service removido - usar serviço de flashcards existente ou desabilitar este script
import logger from '../utils/logger';

/**
 * Script para migrar todos os flashcards existentes de SM-2 para FSRS
 * Execute: npm run migrate-fsrs
 */

const migrateSM2ToFSRS = async () => {
  // Script desativado: serviço FSRS removido
  logger.info('FSRS migration deprecated - script disabled');
  return;
  const db = supabase;

  try {
    logger.info('🚀 Iniciando migração SM-2 → FSRS...');

    // Buscar todos os flashcards
    const { data: flashcards, error } = await db.from('flashcards').select('*');
    if (error) {
      throw error;
    }
    const totalFlashcards = flashcards?.length || 0;

    logger.info(`📊 Total de flashcards encontrados: ${totalFlashcards}`);

    let migratedCount = 0;
    let errorCount = 0;
    let alreadyMigratedCount = 0;

    for (const flashcard of flashcards || []) {
      const flashcardId = flashcard.id;

      try {
        // Verifica se já existe card FSRS
        const { data: existingFSRSCard } = await db
          .from('fsrs_cards')
          .select('id')
          .eq('contentId', flashcardId)
          .eq('userId', flashcard.userId)
          .limit(1)
          .single();

        if (existingFSRSCard) {
          alreadyMigratedCount++;
          logger.info(`⏭️  Flashcard ${flashcardId} já migrado`);
          continue;
        }

        // Migra o flashcard
        // FSRS migration disabled
        migratedCount++;

        if (migratedCount % 10 === 0) {
          logger.info(
            `📈 Progresso: ${migratedCount}/${totalFlashcards} migrados`,
          );
        }
    } catch (error: any) {
        errorCount++;
        logger.error(
          `❌ Erro ao migrar flashcard ${flashcardId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        );
      }
    }

    logger.info('✅ Migração concluída!');
    logger.info("📊 Resumo:");
    logger.info(`   • Migrados: ${migratedCount}`);
    logger.info(`   • Já existiam: ${alreadyMigratedCount}`);
    logger.info(`   • Erros: ${errorCount}`);
    logger.info(`   • Total: ${totalFlashcards}`);
  } catch (error: any) {
    logger.error(
      `💥 Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
    );
    process.exit(1);
  }

  process.exit(0);
};

// Executa o script se chamado diretamente
if (require.main === module) {
  migrateSM2ToFSRS();
}

export default migrateSM2ToFSRS;
