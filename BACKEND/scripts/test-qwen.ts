#!/usr/bin/env ts-node
/**
 * Test script for Qwen3-235B-A22B integration
 * 
 * Usage:
 *   ts-node scripts/test-qwen.ts
 */

import dotenv from 'dotenv';
import { createQwenClient } from '../src/services/qwenClient';

// Load environment variables
dotenv.config();

async function testQwenClient() {
  console.log('🧪 Testing Qwen3-235B-A22B Client\n');

  // Check environment variables
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error('❌ QWEN_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log(`📝 Model: ${process.env.QWEN_MODEL || 'Qwen/Qwen3-235B-A22B'}`);
  console.log(`🧠 Thinking mode: ${process.env.QWEN_ENABLE_THINKING || 'false'}`);
  console.log(`📏 Max context: ${process.env.QWEN_MAX_CONTEXT || '32768'} tokens\n`);

  // Create client
  const client = createQwenClient(apiKey);

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
    console.log('⏳ Enviando requisição para Qwen3...\n');
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

  // Test 2: Batch categorization
  console.log('\n\n📋 Test 2: Batch Categorization (3 questions)\n');

  const batchPrompt = {
    systemPrompt: `Você é um especialista em categorização de questões médicas.
Analise cada questão e retorne as categorizações em formato JSON array.`,
    userPrompt: `Categorize as seguintes 3 questões:

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
    console.log('⏳ Enviando batch para Qwen3...\n');
    const startTime = Date.now();
    
    const result = await client.categorize(batchPrompt, 3);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('✅ Resposta recebida!\n');
    console.log('📊 Resultado:');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n⏱️  Tempo de resposta: ${duration}s`);
    console.log(`🎯 Tokens usados: ${result.metadata?.tokensUsed || 'N/A'}`);

    if (result.success && result.categorizations.length === 3) {
      console.log('\n✅ Teste 2: PASSOU');
    } else {
      console.log(`\n⚠️  Teste 2: PARCIAL - Esperado 3 categorizações, recebido ${result.categorizations.length}`);
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
testQwenClient().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
