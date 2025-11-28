/**
 * Script para limpar todas as sessões antigas de um usuário
 * 
 * Uso: npx ts-node scripts/cleanupSessions.ts inocencio.123@gmail.com
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { SessionService } from '../src/domain/auth/services/SessionService';

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Erro: Email é obrigatório');
    console.log('Uso: npx ts-node scripts/cleanupSessions.ts <email>');
    process.exit(1);
  }

  console.log(`🧹 Limpando todas as sessões de: ${email}`);

  const sessionService = new SessionService();

  try {
    const count = await sessionService.purgeAllUserSessions(email);
    console.log(`✅ ${count} sessões removidas com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao limpar sessões:', error);
    process.exit(1);
  }
}

main();
