/**
 * Script de teste para processamento de imagens do scraper
 */

import fs from 'fs/promises';
import path from 'path';
import { scraperImageProcessingService } from '../src/services/scraperImageProcessingService';

async function testImageProcessing() {
  try {
    console.log('🧪 Testando processamento de imagens do scraper...\n');

    // Ler JSON mais recente
    const questionsDir = path.join(__dirname, '../output/scraped/questions');
    const files = await fs.readdir(questionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('-final'));
    
    if (jsonFiles.length === 0) {
      console.error('❌ Nenhum arquivo JSON encontrado');
      return;
    }

    // Pegar o mais recente
    const latestFile = jsonFiles.sort().reverse()[0];
    const jsonPath = path.join(questionsDir, latestFile);
    
    console.log(`📄 Arquivo: ${latestFile}`);
    
    // Ler questões
    const jsonContent = await fs.readFile(jsonPath, 'utf-8');
    const questions = JSON.parse(jsonContent);
    
    console.log(`📊 Questões: ${questions.length}`);
    console.log(`🖼️  Imagens encontradas: ${questions.filter((q: any) => q.image_urls && q.image_urls.length > 0).length}\n`);

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
    const questionWithImage = questions.find((q: any) => q.image_urls && q.image_urls.length > 0);
    if (questionWithImage) {
      console.log('\n🔍 Exemplo de questão processada:');
      console.log(`   Statement: ${questionWithImage.statement.substring(0, 100)}...`);
      console.log(`   Image URLs: ${questionWithImage.image_urls.join(', ')}`);
    }

    console.log('\n✨ Teste concluído com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

testImageProcessing();
