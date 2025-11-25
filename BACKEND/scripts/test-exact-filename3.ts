import fs from 'fs/promises';
import path from 'path';
import { scraperImageProcessingService } from '../src/services/scraperImageProcessingService';

async function test() {
  const jsonPath = path.join(__dirname, '../output/scraped/questions/sus-sp-2015-1762048501524.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const questions = JSON.parse(jsonContent);
  
  console.log('🧪 Testando upload após exclusão do arquivo no R2...\n');
  
  const result = await scraperImageProcessingService.processQuestions(
    questions,
    'SUS-SP',
    2015,
    jsonPath,
  );

  console.log('\n✅ Resultado:');
  console.log(`   Imagens enviadas: ${result.imagesUploaded}`);
  
  const questionWithImage = questions.find((q: any) => q.statement && q.statement.includes('img src='));
  if (questionWithImage) {
    console.log(`\n🔍 URL da imagem no R2:`);
    console.log(`   ${questionWithImage.image_urls[0]}`);
    
    // Extrair apenas o nome do arquivo
    const filename = questionWithImage.image_urls[0].split('/').pop();
    console.log(`\n📝 Nome do arquivo: ${filename}`);
  }
}

test();
