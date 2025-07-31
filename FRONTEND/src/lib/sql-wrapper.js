// Este arquivo serve como um wrapper para o sql.js para resolver problemas de importação
import * as sqljs from 'sql.js/dist/sql-wasm.js';

// Exportar o initSqlJs como default para compatibilidade
export default sqljs.initSqlJs;

// Também exportar todas as outras funções/objetos do módulo
export * from 'sql.js/dist/sql-wasm.js'; 