import { FirebaseDirectImporter } from './firebase_direct_importer';
import * as path from 'path';
import * as fs from 'fs';

async function reimportClean() {
  const importer = new FirebaseDirectImporter();
  const jsonFilePath = path.join(__dirname, './estrategia_filters_extracted.json');
  
  console.log('🚀 REIMPORTAÇÃO LIMPA - Estrutura correta do Firebase');
  console.log('📂 Arquivo:', jsonFilePath);
  
  // Verificar se arquivo existe
  if (!fs.existsSync(jsonFilePath)) {
    console.error('❌ Arquivo não encontrado:', jsonFilePath);
    process.exit(1);
  }
  
  try {
    // 1. LIMPAR TUDO
    console.log('🧹 ETAPA 1: Limpando todos os dados...');
    await importer.clearExistingData();
    
    // 2. REIMPORTAR COM ESTRUTURA CORRETA
    console.log('📥 ETAPA 2: Importando com estrutura correta...');
    await importer.importFilters(jsonFilePath);
    
    // 3. VALIDAR
    console.log('🔍 ETAPA 3: Validando importação...');
    await importer.validateImport();
    
    console.log('✅ Reimportação concluída com sucesso!');
    console.log('🎯 Agora os subfilters devem aparecer corretamente na página admin!');
    
  } catch (error) {
    console.error('❌ Erro na reimportação:', error);
    process.exit(1);
  }
}

reimportClean(); 