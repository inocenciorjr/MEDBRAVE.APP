/**
 * Script de teste para processamento de imagens do scraper (arquivo específico)
 */

import fs from 'fs/promises';
import path from 'path';
import { scraperImageProcessingService } from '../src/services/scraperImageProcessingService';

async function testImageProcessing() {
  try {
    console.log('🧪 Testando processamento de imagens do scraper...\n');

    // Usar o arquivo mais recente
    const jsonPath = path.join(__dirname, '../output/scraped/questions/sus-sp-2015-1762047836236.json');
    
    console.log(`📄 Arquivo: sus-sp-2015-1762047836236.json`);
    
    // Ler questões
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const questions = JSON.parse(jsonContent);
    
    console.log(`📊 Questões: ${questions.length}`);
    
    // Contar imagens locais
    let localImagesCount = 0;
    questions.forEach((q: any) => {
      if (q.statement && q.statement.includes('/api/temp-images/')) {
        const matches = q.statement.match(/\/api\/temp-images\/[^"']+/g);
        if (matches) localImagesCount += matches.length;
      }
    });
    
    console.log(`🖼️  Imagens locais encontradas: ${localImagesCount}\n`);

    if (localImagesCount === 0) {
      console.log('⚠️  Nenhuma imagem local encontrada. Nada a processar.');
      return;
    }

    // Processar imagens
    console.log('⏳ Processando imagens...\n');
    
    const result = await scraperImageProcessingService.processQuestions(
      questions,
      'SUS-SP',
      2015,
      jsonPath,
    );

    // Exibir resultado
    console.log('\n✅ Processamento concluído!\n');
    console.log('📈 Estatísticas:');
    console.log(`   - Questões processadas: ${result.questionsProcessed}`);
    console.log(`   - Imagens enviadas para R2: ${result.imagesUploaded}`);
    console.log(`   - Imagens com falha: ${result.imagesFailed}`);
    console.log(`   - Imagens locais deletadas: ${result.localImagesDeleted}`);
    console.log(`   - Backup JSON criado: ${result.jsonBackupCreated ? 'Sim' : 'Não'}`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Erros:');
      result.errors.forEach(err => console.log(`   - ${err}`));
    }

    // Verificar questão com imagem
    const questionWithImage = questions.find((q: any) => q.statement && q.statement.includes('img src='));
    if (questionWithImage) {
      console.log('\n🔍 Exemplo de questão processada:');
      console.log(`   Statement (primeiros 150 chars): ${questionWithImage.statement.substring(0, 150)}...`);
      if (questionWithImage.image_urls) {
        console.log(`   Image URLs: ${questionWithImage.image_urls.join(', ')}`);
      }
    }

    console.log('\n✨ Teste concluído com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

testImageProcessing();
