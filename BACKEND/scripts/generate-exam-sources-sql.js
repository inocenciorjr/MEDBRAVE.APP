const fs = require('fs');
const path = require('path');

// Ler lista de provas
const provasListPath = path.join(__dirname, '../output/hardworq/provas-list.json');
const provasList = JSON.parse(fs.readFileSync(provasListPath, 'utf-8'));

console.log(`Gerando SQL para ${provasList.length} provas...`);

// Gerar VALUES
const values = provasList.map(prova => {
  const label = prova.label.replace(/'/g, "''"); // Escapar aspas simples
  return `(${prova.index}, '${label}', '${prova.value}')`;
}).join(',\n');

// Gerar SQL completo
const sql = `-- Inserir ${provasList.length} provas do Hardworq
-- Gerado automaticamente em ${new Date().toISOString()}

INSERT INTO exam_sources (source_index, label, source_value) VALUES
${values}
ON CONFLICT (source_index) DO UPDATE SET 
  label = EXCLUDED.label, 
  source_value = EXCLUDED.source_value, 
  updated_at = NOW();
`;

// Salvar arquivo
const outputPath = path.join(__dirname, 'exam-sources-insert.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log(`✅ SQL gerado com sucesso!`);
console.log(`📄 Arquivo: ${outputPath}`);
console.log(`📊 Total de provas: ${provasList.length}`);
