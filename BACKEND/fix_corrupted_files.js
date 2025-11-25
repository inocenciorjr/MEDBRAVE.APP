const fs = require('fs');
const path = require('path');

const errorFilePath = path.join(__dirname, 'erro.md');
const filesToFix = fs.readFileSync(errorFilePath, 'utf-8').split('\n').map(f => f.trim()).filter(Boolean);

function getFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`File not found, skipping: ${filePath}`);
            return null;
        }
        throw error;
    }
}

function correctFile(filePath) {
    let content = getFileContent(filePath);
    if (content === null) return;

    const lines = content.split('\n');
    if (lines.length < 2) return;

    let firstLine = lines[0];
    let secondLine = lines[1];

    let firstOccurrence = -1;
    let secondOccurrence = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i] === firstLine && lines[i + 1] === secondLine) {
            if (firstOccurrence === -1) {
                firstOccurrence = i;
            } else if (secondOccurrence === -1) {
                secondOccurrence = i;
                break;
            }
        }
    }

    if (firstOccurrence !== -1 && secondOccurrence !== -1) {
        const uniqueContent = lines.slice(firstOccurrence, secondOccurrence).join('\n');
        fs.writeFileSync(filePath, uniqueContent, 'utf-8');
        console.log(`Corrected file: ${filePath}`);
    } else {
        console.log(`No duplicates found, skipping: ${filePath}`);
    }
}

for (const file of filesToFix) {
    correctFile(file);
}

console.log('Done.');