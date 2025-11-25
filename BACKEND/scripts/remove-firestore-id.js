const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'types', 'database.types.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove firestore_id from all interfaces
content = content.replace(/\s*firestore_id: string\s*\n/g, '\n');
content = content.replace(/\s*firestore_id\?: string\s*\n/g, '\n');
content = content.replace(/\s*firestore_id: string \| null\s*\n/g, '\n');
content = content.replace(/\s*firestore_id\?: string \| null\s*\n/g, '\n');

// Write the file back
fs.writeFileSync(filePath, content);

console.log('firestore_id removido de todas as interfaces do database.types.ts');