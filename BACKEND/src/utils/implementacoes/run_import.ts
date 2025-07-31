import { FirebaseDirectImporter } from './firebase_direct_importer';
import * as path from 'path';
import * as fs from 'fs';

async function runImport() {
  const importer = new FirebaseDirectImporter();
  const jsonFilePath = path.join(__dirname, './estrategia_filters_extracted.json');
  
  console.log('🚀 Executando importação automática...');
  console.log('📂 Arquivo:', jsonFilePath);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(jsonFilePath)) {
    console.error('❌ Arquivo não encontrado:', jsonFilePath);
    process.exit(1);
  }
  
  try {
    // Executar importação
    await importer.importFilters(jsonFilePath);
    
    // Validar resultado
    await importer.validateImport();
    
    console.log('✅ Importação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

runImport(); 