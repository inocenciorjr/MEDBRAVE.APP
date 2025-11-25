// Teste simples do LM Studio
const axios = require('axios');

async function testLMStudio() {
  try {
    console.log('🧪 Testando LM Studio...');
    
    const response = await axios.post('http://localhost:1234/v1/chat/completions', {
      model: 'qwen/qwen3-vl-8b',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Say hello in one word.'
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    console.log('✅ Sucesso!');
    console.log('Resposta:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testLMStudio();
