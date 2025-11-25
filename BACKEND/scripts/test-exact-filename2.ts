import fs from 'fs/promises';
import path from 'path';
import { scraperImageProcessingService } from '../src/services/scraperImageProcessingService';

async function test() {
  const jsonPath = path.join(__dirname, '../output/scraped/questions/sus-sp-2015-1762048406475.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const questions = JSON.parse(jsonContent);
  
  console.log('🧪 Testando upload com nome exato (novo)...\n');
  
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
    console.log(`\n🔍 URL da imagem: ${questionWithImage.image_urls[0]}`);
  }
}

test();
