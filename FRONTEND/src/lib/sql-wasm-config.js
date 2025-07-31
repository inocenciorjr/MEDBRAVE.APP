// Configuração para o sql.js no frontend
// Este arquivo é usado para resolver problemas de importação do sql.js no ambiente Vite
import initSqlJs from 'sql.js';

// Mock para o módulo fs que é usado pelo sql.js
const fs = {
  readFileSync: () => {
    throw new Error('readFileSync não está disponível no navegador');
  },
  existsSync: () => false,
};

// Mock para o módulo path
const path = {
  join: (...args) => args.join('/'),
};

// Exportar os mocks e o initSqlJs
export { fs, path, initSqlJs };

// Função para carregar o sql.js de forma segura no frontend
export async function loadSqlJs(config = {}) {
  // Carregar o wasm diretamente
  return initSqlJs({
    locateFile: file => `/node_modules/sql.js/dist/${file}`
  });
} 