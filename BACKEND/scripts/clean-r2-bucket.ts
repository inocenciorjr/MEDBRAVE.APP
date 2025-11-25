/**
 * Script para limpar arquivos do bucket R2
 * 
 * Uso:
 * 1. Listar todos os arquivos:
 *    npm run clean-r2 -- --list
 * 
 * 2. Limpar pasta específica:
 *    npm run clean-r2 -- --folder questions/images
 * 
 * 3. Limpar tudo (CUIDADO!):
 *    npm run clean-r2 -- --all --confirm
 * 
 * 4. Limpar arquivos antigos (mais de X dias):
 *    npm run clean-r2 -- --older-than 30
 */

import { r2Service } from '../src/services/r2Service';

interface CleanOptions {
  list?: boolean;
  folder?: string;
  all?: boolean;
  confirm?: boolean;
  olderThan?: number; // dias
  dryRun?: boolean;
  fast?: boolean; // Modo rápido (batch maior)
}

async function parseArgs(): Promise<CleanOptions> {
  const args = process.argv.slice(2);
  const options: CleanOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--list') {
      options.list = true;
    } else if (arg === '--folder' && args[i + 1]) {
      options.folder = args[i + 1];
      i++;
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--confirm') {
      options.confirm = true;
    } else if (arg === '--older-than' && args[i + 1]) {
      options.olderThan = parseInt(args[i + 1]);
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--fast') {
      options.fast = true;
    }
  }

  return options;
}

async function getAllFiles(folder: string = ''): Promise<Array<{
  key: string;
  size: number;
  lastModified: Date;
  url: string;
}>> {
  let allFiles: Array<{
    key: string;
    size: number;
    lastModified: Date;
    url: string;
  }> = [];
  
  let hasMore = true;
  let iterations = 0;
  const maxIterations = 100; // Segurança para evitar loop infinito
  
  while (hasMore && iterations < maxIterations) {
    const batch = await r2Service.listFiles(folder, 1000);
    
    if (batch.length === 0) {
      hasMore = false;
    } else {
      allFiles = allFiles.concat(batch);
      
      // Se retornou menos que 1000, não há mais arquivos
      if (batch.length < 1000) {
        hasMore = false;
      } else {
        console.log(`   Carregando... ${allFiles.length} arquivos encontrados até agora`);
      }
    }
    
    iterations++;
  }
  
  return allFiles;
}

async function listFiles(folder: string = ''): Promise<void> {
  console.log(`\n📋 Listando arquivos${folder ? ` na pasta "${folder}"` : ' no bucket'}...\n`);

  try {
    const files = await getAllFiles(folder);

    if (files.length === 0) {
      console.log('✅ Nenhum arquivo encontrado.');
      return;
    }

    console.log(`📊 Total de arquivos: ${files.length}\n`);

    // Agrupar por pasta
    const byFolder: Record<string, typeof files> = {};
    
    for (const file of files) {
      const folderPath = file.key.split('/').slice(0, -1).join('/') || 'root';
      if (!byFolder[folderPath]) {
        byFolder[folderPath] = [];
      }
      byFolder[folderPath].push(file);
    }

    // Exibir por pasta
    for (const [folderPath, folderFiles] of Object.entries(byFolder)) {
      console.log(`\n📁 ${folderPath}/ (${folderFiles.length} arquivos)`);
      
      const totalSize = folderFiles.reduce((sum, f) => sum + f.size, 0);
      console.log(`   Tamanho total: ${formatBytes(totalSize)}`);
      
      // Mostrar primeiros 5 arquivos
      const preview = folderFiles.slice(0, 5);
      for (const file of preview) {
        const date = file.lastModified.toLocaleDateString('pt-BR');
        console.log(`   - ${file.key.split('/').pop()} (${formatBytes(file.size)}) - ${date}`);
      }
      
      if (folderFiles.length > 5) {
        console.log(`   ... e mais ${folderFiles.length - 5} arquivos`);
      }
    }

    // Resumo total
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n📊 Resumo:`);
    console.log(`   Total de arquivos: ${files.length}`);
    console.log(`   Tamanho total: ${formatBytes(totalSize)}`);
    console.log(`   Pastas: ${Object.keys(byFolder).length}`);

  } catch (error: any) {
    console.error('❌ Erro ao listar arquivos:', error.message);
    process.exit(1);
  }
}

async function deleteFiles(
  folder: string = '',
  olderThan?: number,
  dryRun: boolean = false
): Promise<void> {
  console.log(`\n🗑️  ${dryRun ? '[DRY RUN] ' : ''}Deletando arquivos${folder ? ` da pasta "${folder}"` : ''}...\n`);

  try {
    console.log('📥 Carregando lista completa de arquivos...');
    const files = await getAllFiles(folder);
    console.log(`✅ ${files.length} arquivos encontrados\n`);

    if (files.length === 0) {
      console.log('✅ Nenhum arquivo encontrado para deletar.');
      return;
    }

    // Filtrar por data se necessário
    let filesToDelete = files;
    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThan);
      
      filesToDelete = files.filter(f => f.lastModified < cutoffDate);
      
      console.log(`📅 Filtrando arquivos mais antigos que ${olderThan} dias (antes de ${cutoffDate.toLocaleDateString('pt-BR')})`);
      console.log(`   Arquivos encontrados: ${filesToDelete.length} de ${files.length}\n`);
    }

    if (filesToDelete.length === 0) {
      console.log('✅ Nenhum arquivo corresponde aos critérios.');
      return;
    }

    const totalSize = filesToDelete.reduce((sum, f) => sum + f.size, 0);
    
    console.log(`⚠️  Arquivos a serem deletados: ${filesToDelete.length}`);
    console.log(`⚠️  Tamanho total: ${formatBytes(totalSize)}\n`);

    if (dryRun) {
      console.log('🔍 [DRY RUN] Arquivos que seriam deletados:\n');
      for (const file of filesToDelete.slice(0, 10)) {
        console.log(`   - ${file.key} (${formatBytes(file.size)})`);
      }
      if (filesToDelete.length > 10) {
        console.log(`   ... e mais ${filesToDelete.length - 10} arquivos`);
      }
      console.log('\n✅ Dry run completo. Nenhum arquivo foi deletado.');
      return;
    }

    // Deletar arquivos EM LOTE (paralelo)
    let deleted = 0;
    let failed = 0;

    const BATCH_SIZE = 50; // Deletar 50 arquivos por vez em paralelo
    
    console.log(`🗑️  Deletando arquivos em lote (${BATCH_SIZE} por vez)...\n`);
    
    for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
      const batch = filesToDelete.slice(i, i + BATCH_SIZE);
      
      // Deletar batch em paralelo
      const results = await Promise.allSettled(
        batch.map(file => r2Service.deleteFile(file.key))
      );
      
      // Contar sucessos e falhas
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          deleted++;
        } else {
          failed++;
          console.error(`   ❌ Erro ao deletar ${batch[idx].key}: ${result.reason?.message || 'Erro desconhecido'}`);
        }
      });
      
      // Mostrar progresso
      const progress = Math.min(i + BATCH_SIZE, filesToDelete.length);
      console.log(`   Progresso: ${progress}/${filesToDelete.length} arquivos processados (${deleted} deletados, ${failed} falhas)`);
    }

    console.log(`\n✅ Deleção completa!`);
    console.log(`   Deletados: ${deleted}`);
    console.log(`   Falhas: ${failed}`);
    console.log(`   Total: ${filesToDelete.length}`);

  } catch (error: any) {
    console.error('❌ Erro ao deletar arquivos:', error.message);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function main() {
  console.log('🚀 Script de Limpeza do R2\n');

  const options = await parseArgs();

  // Validações
  if (options.all && !options.confirm) {
    console.error('❌ Para deletar TODOS os arquivos, use --all --confirm');
    console.error('   Isso é uma medida de segurança para evitar deleções acidentais.');
    process.exit(1);
  }

  if (!options.list && !options.folder && !options.all) {
    console.log('📖 Uso:');
    console.log('');
    console.log('  Listar arquivos:');
    console.log('    npm run clean-r2 -- --list');
    console.log('    npm run clean-r2 -- --list --folder questions/images');
    console.log('');
    console.log('  Deletar arquivos:');
    console.log('    npm run clean-r2 -- --folder questions/images');
    console.log('    npm run clean-r2 -- --folder questions/images --dry-run');
    console.log('    npm run clean-r2 -- --older-than 30');
    console.log('    npm run clean-r2 -- --all --confirm');
    console.log('');
    console.log('  Opções:');
    console.log('    --list              Apenas listar arquivos');
    console.log('    --folder <path>     Pasta específica');
    console.log('    --all               Deletar TUDO (requer --confirm)');
    console.log('    --confirm           Confirmar deleção de tudo');
    console.log('    --older-than <days> Deletar arquivos mais antigos que X dias');
    console.log('    --dry-run           Simular sem deletar');
    console.log('');
    process.exit(0);
  }

  // Executar ação
  if (options.list) {
    await listFiles(options.folder);
  } else {
    await deleteFiles(
      options.all ? '' : options.folder || '',
      options.olderThan,
      options.dryRun
    );
  }

  console.log('\n✅ Script finalizado.\n');
}

// Executar
main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
