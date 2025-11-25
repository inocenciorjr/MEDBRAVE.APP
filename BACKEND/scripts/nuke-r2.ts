/**
 * Script AGRESSIVO para DELETAR TUDO do R2
 * 
 * ⚠️ ATENÇÃO: Este script deleta TODOS os arquivos sem perguntar!
 * 
 * Uso:
 * npm run nuke-r2
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import * as https from 'https';

// Configuração do R2
const R2_CONFIG = {
  accountId: process.env.R2_ACCOUNT_ID || '16fc5a72ff773d4925e9e5a1b0136737',
  bucketName: process.env.R2_BUCKET_NAME || 'medbrave',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '41c779389c2f6cd8039d2537cced5a69',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'f99e3b6cc38730d0a8ccb266a8adedb9a677ed5308a8a39b18edd8b43dbb2a78',
  endpoint: process.env.R2_ENDPOINT || 'https://16fc5a72ff773d4925e9e5a1b0136737.r2.cloudflarestorage.com',
};

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 60000,
  rejectUnauthorized: false,
});

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
  forcePathStyle: true,
  maxAttempts: 3,
  requestHandler: {
    httpsAgent,
    connectionTimeout: 30000,
    socketTimeout: 60000,
  },
});

async function deleteAllObjects() {
  console.log('🔥 INICIANDO LIMPEZA TOTAL DO R2...\n');
  
  let totalDeleted = 0;
  let continuationToken: string | undefined = undefined;
  let iteration = 0;

  do {
    iteration++;
    console.log(`\n📦 Iteração ${iteration}: Listando objetos...`);

    // Listar objetos
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });

    const listResponse: ListObjectsV2CommandOutput = await r2Client.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length === 0) {
      console.log('✅ Nenhum objeto encontrado.');
      break;
    }

    console.log(`   Encontrados: ${objects.length} objetos`);
    console.log(`   Deletando em lote...`);

    // Deletar em lote (até 1000 por vez)
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: R2_CONFIG.bucketName,
      Delete: {
        Objects: objects.map((obj: any) => ({ Key: obj.Key! })),
        Quiet: true,
      },
    });

    const deleteResponse = await r2Client.send(deleteCommand);
    
    const deleted = objects.length - (deleteResponse.Errors?.length || 0);
    totalDeleted += deleted;

    console.log(`   ✅ Deletados: ${deleted}`);
    
    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.log(`   ❌ Erros: ${deleteResponse.Errors.length}`);
      deleteResponse.Errors.forEach(err => {
        console.log(`      - ${err.Key}: ${err.Message}`);
      });
    }

    console.log(`   📊 Total deletado até agora: ${totalDeleted}`);

    // Próxima página
    continuationToken = listResponse.NextContinuationToken;

  } while (continuationToken);

  console.log(`\n🎉 LIMPEZA COMPLETA!`);
  console.log(`   Total de objetos deletados: ${totalDeleted}`);
}

async function main() {
  console.log('⚠️  ⚠️  ⚠️  ATENÇÃO ⚠️  ⚠️  ⚠️');
  console.log('Este script vai DELETAR TODOS OS ARQUIVOS do bucket R2!');
  console.log(`Bucket: ${R2_CONFIG.bucketName}`);
  console.log('');
  console.log('Aguardando 3 segundos antes de começar...');
  console.log('Pressione Ctrl+C para cancelar!');
  console.log('');

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    await deleteAllObjects();
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
