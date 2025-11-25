// Script para testar o endpoint /due
// Execute com: node test-due-endpoint.js

const fetch = require('node-fetch');

async function testDueEndpoint() {
  try {
    const response = await fetch('http://localhost:5000/api/unified-reviews/due?contentType=QUESTION&limit=200', {
      headers: {
        'Authorization': 'Bearer SEU_TOKEN_AQUI'
      }
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Erro:', error);
  }
}

testDueEndpoint();
