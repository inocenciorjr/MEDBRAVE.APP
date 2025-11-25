const fs = require('fs');
const path = require('path');

const filePath = 'C:\\MEDBRAVE.APP\\MEDBRAVE.APP\\BACKEND\\src\\domain\\integration\\controller\\dataImportExportController.ts';

function fixDataImportExportController() {
  try {
    console.log('Corrigindo dataImportExportController.ts...');
    
    // Create backup
    const backupPath = filePath + '.backup-' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup criado: ${backupPath}`);
    
    // Read file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines
    let lines = content.split('\n');
    
    console.log(`Total de linhas: ${lines.length}`);
    
    // Find the class declaration
    let classStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export class DataImportExportController')) {
        classStartIndex = i;
        break;
      }
    }
    
    if (classStartIndex === -1) {
      console.error('Não foi possível encontrar a declaração da classe');
      return;
    }
    
    console.log(`Classe encontrada na linha: ${classStartIndex + 1}`);
    
    // Rebuild the file with proper structure
    const properImports = [
      "import { Request, Response, NextFunction } from 'express';",
      "import {",
      "  DataJobType,",
      "  DataFormat,",
      "  DataJobStatus,",
      "} from '../../../infra/integration/types';",
      "import { IDataImportExportService } from '../../../infra/integration/interfaces/IDataImportExportService';",
      "import { ErrorCodes, createError } from '../../../utils/errors';",
      "import logger from '../../../utils/logger';",
      "",
    ];
    
    // Find the end of the class (last closing brace)
    let classEndIndex = -1;
    let braceCount = 0;
    let foundClassStart = false;
    
    for (let i = classStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('export class DataImportExportController')) {
        foundClassStart = true;
      }
      
      if (foundClassStart) {
        // Count braces
        for (let char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        
        // If we've closed all braces, we found the end
        if (braceCount === 0 && line.includes('}')) {
          classEndIndex = i;
          break;
        }
      }
    }
    
    if (classEndIndex === -1) {
      console.error('Não foi possível encontrar o final da classe');
      return;
    }
    
    console.log(`Final da classe na linha: ${classEndIndex + 1}`);
    
    // Extract only the class content (from class declaration to its end)
    let classLines = [];
    for (let i = classStartIndex; i <= classEndIndex; i++) {
      const line = lines[i];
      // Skip any duplicate import statements within the class
      if (!line.trim().startsWith('import ') && 
          !line.trim().startsWith('} from ') &&
          !line.trim().startsWith('DataJobType,') &&
          !line.trim().startsWith('DataFormat,') &&
          !line.trim().startsWith('DataJobStatus,')) {
        classLines.push(line);
      } else {
        console.log(`Removendo linha duplicada dentro da classe: ${line.trim()}`);
      }
    }
    
    // Combine imports + class
    const finalLines = [...properImports, ...classLines];
    
    // Join and clean up
    let finalContent = finalLines.join('\n');
    finalContent = finalContent.replace(/\n{3,}/g, '\n\n'); // Remove excessive line breaks
    finalContent = finalContent.replace(/\r\n/g, '\n'); // Normalize line endings
    finalContent = finalContent.trim();
    
    // Write the cleaned content
    fs.writeFileSync(filePath, finalContent, 'utf8');
    
    console.log('Arquivo corrigido com sucesso!');
    console.log(`Linhas originais: ${lines.length}`);
    console.log(`Linhas finais: ${finalLines.length}`);
    
  } catch (error) {
    console.error('Erro ao corrigir arquivo:', error.message);
  }
}

if (require.main === module) {
  fixDataImportExportController();
}

module.exports = { fixDataImportExportController };