import fs from 'fs/promises';
import path from 'path';
import { scraperImageProcessingService } from '../src/services/scraperImageProcessingService';

async function test() {
  const jsonPath = path.join(__dirname, '../output/scraped/questions/sus-sp-2015-1762049171723.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const questions = JSON.parse(jsonContent);
  
  console.log('🧪 Testando após deletar r2Service.js...\n');
  
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
    const filename = questionWithImage.image_urls[0].split('/').pop();
    console.log(`\n📝 Nome do arquivo: ${filename}`);
    
    if (filename === 'q02.jpg') {
      console.log('✅ SUCESSO! Nome exato sem timestamp/randomId');
    } else {
      console.log('❌ FALHA! Ainda tem timestamp/randomId');
    }
  }
}

test();
