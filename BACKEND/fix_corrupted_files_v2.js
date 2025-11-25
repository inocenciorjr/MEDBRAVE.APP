const fs = require('fs');
const path = require('path');

const errorFilePath = path.join(__dirname, 'erro.md');
const filesToFix = fs.readFileSync(errorFilePath, 'utf-8').split(/\r?\n/).map(f => f.trim()).filter(Boolean);

function correctFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found, skipping: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) {
        console.log(`File is empty, skipping: ${filePath}`);
        return;
    }

    const lines = content.split(/\r?\n/);
    
    // Heuristic: Find the last occurrence of the first ~5 non-empty lines
    const nonEmptyLines = lines.filter(l => l.trim() !== '');
    if (nonEmptyLines.length < 5) {
        console.log(`Not enough content to determine corruption, skipping: ${filePath}`);
        return;
    }

    const blockToSearch = nonEmptyLines.slice(0, 5).join('\n');
    const lastOccurrenceIndex = content.lastIndexOf(blockToSearch);

    if (lastOccurrenceIndex > 0) {
        const correctedContent = content.substring(lastOccurrenceIndex);
        fs.writeFileSync(filePath, correctedContent, 'utf-8');
        console.log(`Corrected file: ${filePath}`);
    } else {
        console.log(`No clear repetition found, skipping: ${filePath}`);
    }
}

for (const file of filesToFix) {
    correctFile(file);
}

console.log('Done.');