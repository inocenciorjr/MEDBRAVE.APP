#!/usr/bin/env ts-node
/**
 * Test script for MiniMax M2 integration
 * 
 * Usage:
 *   ts-node scripts/test-minimax.ts
 */

import dotenv from 'dotenv';
import { createMinimaxClient } from '../src/services/minimaxClient';

// Load environment variables
dotenv.config();

async function testMinimaxClient() {
  console.log('🧪 Testing MiniMax M2 Client\n');

  // Check environment variables
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    console.error('❌ MINIMAX_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log(`📝 Model: ${process.env.MINIMAX_MODEL || 'MiniMax-M2'}`);
  console.log(`📏 Max output tokens: ${process.env.MINIMAX_MAX_TOKENS || '128000'}\n`);

  // Create client
  const client = createMinimaxClient(apiKey);

  // Test 1: Simple categorization
  console.log('📋 Test 1: Simple Medical Question Categorization\n');
  
  const testPrompt = {
    systemPrompt: `Você é um especialista em categorização de questões médicas.
Analise a questão e retorne a categorização em formato JSON.`,
    userPrompt: `Questão: Um paciente de 65 anos apresenta dispneia aos esforços e edema de membros inferiores. 
Ao exame físico, nota-se turgência jugular e estertores crepitantes em bases pulmonares.
Qual o diagnóstico mais provável?

A) Pneumonia
B) Insuficiência cardíaca congestiva
C) Embolia pulmonar
D) Asma brônquica

Resposta correta: B

Categorize esta questão nas seguintes categorias:
- Especialidade médica
- Sistema orgânico
- Tipo de questão (diagnóstico, tratamento, etc.)

Retorne em formato JSON:
{
  "especialidade": "...",
  "sistema": "...",
  "tipo": "..."
}`,
  };

  try {
    console.log('⏳ Enviando requisição para MiniMax M2...\n');
    const startTime = Date.now();
    
    const result = await client.categorize(testPrompt, 1);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ Resposta recebida!\n');
    console.log('📊 Resultado:');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n⏱️  Tempo de resposta: ${duration}s`);
    console.log(`🎯 Tokens usados: ${result.metadata?.tokensUsed || 'N/A'}`);

    if (result.success && result.categorizations.length > 0) {
      console.log('\n✅ Teste 1: PASSOU');
    } else {
      console.log('\n❌ Teste 1: FALHOU - Nenhuma categorização retornada');
    }
  } catch (error: any) {
    console.error('\n❌ Teste 1: FALHOU');
    console.error('Erro:', error.message);
    if (error.response?.data) {
      console.error('Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
  }

  // Test 2: Batch categorization (5 questions - recommended batch size)
  console.log('\n\n📋 Test 2: Batch Categorization (5 questions)\n');

  const batchPrompt = {
    systemPrompt: `Você é um especialista em categorização de questões médicas.
Analise cada questão e retorne as categorizações em formato JSON array.
Use seu raciocínio (Interleaved Thinking) para analisar cada questão cuidadosamente.`,
    userPrompt: `Categorize as seguintes 5 questões:

QUESTÃO 1:
Paciente com febre, tosse produtiva e dispneia. Raio-X mostra infiltrado pulmonar.
A) Pneumonia
B) Tuberculose
C) Bronquite
D) Asma
Resposta: A

QUESTÃO 2:
Criança de 5 anos com dor abdominal periumbilical que migrou para fossa ilíaca direita.
A) Apendicite
B) Gastroenterite
C) Constipação
D) Parasitose
Resposta: A

QUESTÃO 3:
Gestante de 32 semanas com pressão arterial 160x110 mmHg e proteinúria.
A) Hipertensão crônica
B) Pré-eclâmpsia
C) Eclâmpsia
D) Hipertensão gestacional
Resposta: B

QUESTÃO 4:
Paciente diabético com ferida no pé há 3 semanas, sem melhora. Apresenta secreção purulenta.
A) Celulite
B) Pé diabético infectado
C) Osteomielite
D) Trombose venosa
Resposta: B

QUESTÃO 5:
Criança de 2 anos com febre alta, irritabilidade e rigidez de nuca.
A) Meningite
B) Encefalite
C) Otite média
D) Faringite
Resposta: A

Retorne um array JSON com a categorização de cada questão:
[
  {
    "numero": "1",
    "especialidade": "...",
    "sistema": "...",
    "tipo": "..."
  },
  ...
]`,
  };

  try {
    console.log('⏳ Enviando batch para MiniMax M2...\n');
    const startTime = Date.now();
    
    const result = await client.categorize(batchPrompt, 5);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ Resposta recebida!\n');
    console.log('📊 Resultado:');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n⏱️  Tempo de resposta: ${duration}s`);
    console.log(`🎯 Tokens usados: ${result.metadata?.tokensUsed || 'N/A'}`);

    if (result.success && result.categorizations.length === 5) {
      console.log('\n✅ Teste 2: PASSOU');
    } else {
      console.log(`\n⚠️  Teste 2: PARCIAL - Esperado 5 categorizações, recebido ${result.categorizations.length}`);
    }
  } catch (error: any) {
    console.error('\n❌ Teste 2: FALHOU');
    console.error('Erro:', error.message);
    if (error.response?.data) {
      console.error('Detalhes:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n\n🏁 Testes concluídos!\n');
}

// Run tests
testMinimaxClient().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
