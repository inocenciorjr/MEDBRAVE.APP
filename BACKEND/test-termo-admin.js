const axios = require('axios');

// Configuração do teste
const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your_admin_token_here';

const testAdminEndpoints = async () => {
  try {
    console.log('🧪 Testando endpoints administrativos do Termo...\n');

    // Teste 1: Forçar geração da palavra do dia
    console.log('1. Forçando geração da palavra do dia...');
    try {
      const response = await axios.post(
        `${BASE_URL}/admin/games/termo/daily-word/force-generate`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Palavra gerada com sucesso:', response.data);
    } catch (error) {
      console.log('❌ Erro ao gerar palavra:', error.response?.data || error.message);
    }

    // Teste 2: Listar palavras do dia
    console.log('\n2. Listando palavras do dia...');
    try {
      const response = await axios.get(
        `${BASE_URL}/admin/games/termo/daily-word/list`,
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          }
        }
      );
      console.log('✅ Palavras encontradas:', response.data);
    } catch (error) {
      console.log('❌ Erro ao listar palavras:', error.response?.data || error.message);
    }

    // Teste 3: Gerar palavra manualmente
    console.log('\n3. Gerando palavra manualmente...');
    try {
      const response = await axios.post(
        `${BASE_URL}/admin/games/termo/daily-word/generate`,
        {
          word: 'CORAÇÃO',
          date: new Date().toISOString().split('T')[0]
        },
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Palavra manual gerada:', response.data);
    } catch (error) {
      console.log('❌ Erro ao gerar palavra manual:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
};

// Executar teste
if (require.main === module) {
  testAdminEndpoints();
}

module.exports = { testAdminEndpoints };