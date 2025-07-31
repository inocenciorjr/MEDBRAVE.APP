import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

interface ExtractedImage {
  id: string;
  buffer: Buffer | string;
  filename: string;
  pageNumber?: number;
  type?: string;
  description?: string;
}

interface ExtractedTable {
  id: string;
  rows: string[][];
  position?: any;
  pageNumber?: number;
}

interface ExtractedQuestion {
  numero: string;
  enunciado: string;
  alternativas: string[];
  tables?: ExtractedTable[];
  examData?: string[];
  images?: ExtractedImage[];
}

interface ExtractedHtmlResult {
  questions: ExtractedQuestion[];
  images: ExtractedImage[];
  tables: ExtractedTable[];
  structuredText: string[];
  rawText: string;
}

export async function extractQuestionsFromHtml(htmlContent: string): Promise<ExtractedHtmlResult> {
  console.log('🔍 Iniciando extração de questões do HTML...');
  
  // Estruturas para armazenar resultados
  const images: ExtractedImage[] = [];
  const tables: ExtractedTable[] = [];
  const questions: ExtractedQuestion[] = [];
  const structuredText: string[] = [];
  
  // Carregar HTML no cheerio para parsing robusto
  const $ = cheerio.load(htmlContent);
  
  // Extrair texto bruto para referência
  const rawText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Debug: salvar uma cópia do HTML para verificação
  try {
    fs.writeFileSync('debug_html_input.html', htmlContent, 'utf-8');
    console.log('✅ HTML salvo em debug_html_input.html para depuração');
  } catch (err) {
    console.error('⚠️ Não foi possível salvar o HTML para depuração:', err);
  }
  
  // 1. EXTRAIR TODAS AS QUESTÕES DO REVALIDA
  console.log('🔍 Buscando questões no documento HTML...');
  
  // No formato do REVALIDA2025.1.html, as questões têm um padrão específico de classe e texto
  const questionTitles: { index: number, numero: string, element: cheerio.Element }[] = [];
  
  // Buscar por spans com classe 's1' que contém "QUESTÃO"
  $('span.t.s1').each((index, element) => {
    const text = $(element).text().trim();
    
    // Regex para encontrar "QUESTÃO X" onde X é um número
    const match = text.match(/QUEST(Ã|A)O\s+(\d+)/i);
    if (match) {
      const questionNumber = match[2];
      questionTitles.push({
        index,
        numero: questionNumber,
        element
      });
      console.log(`🔍 Questão ${questionNumber} encontrada`);
    }
  });
  
  console.log(`📊 Total de ${questionTitles.length} questões encontradas`);
  
  // 2. PROCESSAR CADA QUESTÃO
  for (let i = 0; i < questionTitles.length; i++) {
    const current = questionTitles[i];
    
    console.log(`⚙️ Processando questão ${current.numero}...`);
    
    // Extrair o elemento pai que contém a questão (geralmente um div)
    const questionElement = $(current.element).closest('.page');
    
    if (!questionElement.length) {
      console.log(`⚠️ Não foi possível localizar o elemento pai da questão ${current.numero}`);
      continue;
    }
    
    // 3. EXTRAIR ENUNCIADO
    // Vamos pegar todos os spans de texto que vêm após o título da questão e antes das alternativas
    let enunciado = '';
    const questionTexts: string[] = [];
    const examData: string[] = [];
    
    // Encontrar todos os elementos span com classe 's2' após o título da questão
    const nextElements = $(current.element).nextAll('span.t.s2');
    
    // Encontrar as alternativas (spans com classe 's4')
    const alternativeElements: cheerio.Element[] = [];
    questionElement.find('span.t.s4').each((_, element) => {
      const text = $(element).text().trim();
      // Verificar se é uma alternativa (A, B, C, D, E)
      if (/^[A-E]\s*$/.test(text)) {
        alternativeElements.push(element);
      }
    });
    
    // Processar texto do enunciado até encontrar a primeira alternativa
    let foundFirstAlternative = false;
    let currentExamTable: string[][] = [];
    let isInsideExamTable = false;
    
    nextElements.each((_, element) => {
      const text = $(element).text().trim();
      
      // Se já encontramos a primeira alternativa, ignoramos o restante
      if (foundFirstAlternative) return;
      
      // Verificar se este elemento pode ser conteúdo de alternativa
      // usando heurística simples
      if (alternativeElements.length > 0) {
        foundFirstAlternative = true;
        return;
      }
      
      // Detectar tabelas de exames (comum em questões médicas)
      if (/^Exame/.test(text) || /^Parâmetro/.test(text) || /^Resultado/.test(text)) {
        isInsideExamTable = true;
        examData.push(text);
        
        // Iniciar uma nova linha na tabela
        if (!currentExamTable.length) {
          currentExamTable.push([text]);
        } else {
          // Adicionar à última linha
          currentExamTable[currentExamTable.length - 1].push(text);
        }
        return;
      }
      
      // Se estamos em uma tabela de exames, continuar a coleta
      if (isInsideExamTable) {
        examData.push(text);
        
        // Verificar se é uma nova linha ou continuação
        const isNewLine = /^[0-9,.]+\s*(mg\/dL|g\/dL|%|bpm|mmHg|fL|pg|\/mm3?|irpm|°C|cm)$/.test(text) ||
                         /^(Frequência|Pressão|Temperatura|Saturação|Hemoglobina|Hematócrito|Leucócitos|Volume|Plaquetas)/.test(text);
        
        if (isNewLine) {
          currentExamTable.push([text]);
        } else if (currentExamTable.length > 0) {
          // Adicionar à última linha
          currentExamTable[currentExamTable.length - 1].push(text);
        }
        
        // Verificar se a tabela terminou
        if (text.endsWith('.') || text.length > 50) {
          isInsideExamTable = false;
          
          // Se temos uma tabela válida, adicionamos à lista de tabelas
          if (currentExamTable.length > 1) {
            tables.push({
              id: `table-${uuidv4()}`,
              rows: [...currentExamTable]
            });
            currentExamTable = [];
          }
        }
        
        return;
      }
      
      // Adicionar ao enunciado se não for parte de uma tabela
      questionTexts.push(text);
    });
    
    // Montar o enunciado a partir dos textos coletados
    enunciado = questionTexts.join(' ');
    
    // 4. EXTRAIR ALTERNATIVAS
    const alternativas: string[] = [];
    
    // Para cada letra de alternativa (A, B, C, D)
    for (const altLetter of ['A', 'B', 'C', 'D']) {
      // Encontrar o elemento da alternativa
      const altTitleElement = questionElement.find(`span.t.s4:contains("${altLetter}")`).first();
      
      if (altTitleElement.length) {
        let altText = '';
        
        // Pegar todos os spans seguintes até a próxima alternativa
        const nextAltLetter = String.fromCharCode(altLetter.charCodeAt(0) + 1);
        const nextAltElement = questionElement.find(`span.t.s4:contains("${nextAltLetter}")`).first();
        
        // Se não encontrarmos a próxima alternativa, pegamos até o final da questão
        if (!nextAltElement.length) {
          // Pegar todos os spans após esta alternativa
          altTitleElement.nextAll('span.t.s2').each((_, element) => {
            altText += ' ' + $(element).text().trim();
          });
        } else {
          // Pegar spans entre esta alternativa e a próxima
          let currentElement = altTitleElement.next();
          
          while (currentElement.length && !currentElement.is(nextAltElement)) {
            if (currentElement.hasClass('t') && currentElement.hasClass('s2')) {
              altText += ' ' + currentElement.text().trim();
            }
            currentElement = currentElement.next();
          }
        }
        
        // Limpar e formatar o texto da alternativa
        altText = altText.trim().replace(/\s+/g, ' ');
        
        if (altText) {
          alternativas.push(altText);
          console.log(`📌 Alternativa ${altLetter}: "${altText.substring(0, 30)}..."`);
        }
      }
    }
    
    // 5. EXTRAIR IMAGENS
    // No HTML do REVALIDA, as imagens estão em tags <image> dentro de SVGs
    const extractedImages: ExtractedImage[] = [];
    
    questionElement.find('image').each((_, element) => {
      const src = $(element).attr('href');
      if (src) {
        // Extrair imagem base64
        const imgId = uuidv4();
        const filename = `img-${imgId}.png`;
        
        extractedImages.push({
          id: imgId,
          buffer: src, // Já está em formato base64
          filename,
          type: 'image/png',
          pageNumber: i + 1
        });
        
        console.log(`🖼️ Imagem encontrada na questão ${current.numero}`);
      }
    });
    
    // Adicionar imagens globais
    images.push(...extractedImages);
    
    // 6. CRIAR OBJETO DE QUESTÃO
    if (enunciado || alternativas.length > 0) {
      const question: ExtractedQuestion = {
        numero: current.numero,
        enunciado,
        alternativas,
        examData: examData.length > 0 ? examData : undefined,
        images: extractedImages.length > 0 ? extractedImages : undefined,
        tables: currentExamTable.length > 0 ? [{ id: `table-${uuidv4()}`, rows: [...currentExamTable] }] : undefined
      };
      
      questions.push(question);
      console.log(`✅ Questão ${current.numero} extraída com ${alternativas.length} alternativas`);
    }
  }
  
  // Extrair texto estruturado para referência
  $('p, span.t').each((_, element) => {
    const text = $(element).text().trim();
    if (text) {
      structuredText.push(text);
    }
  });
  
  console.log(`📊 Resultado final: ${questions.length} questões extraídas`);
  
  return {
    questions,
    images,
    tables,
    structuredText,
    rawText
  };
}

/**
 * Função auxiliar para converter o extrato HTML em questões formatadas
 * para o sistema de administração
 */
export function convertToAdminQuestions(extractResult: ExtractedHtmlResult) {
  return extractResult.questions.map((q, idx) => {
    // Preparar o enunciado com possíveis tabelas e imagens
    let enhancedEnunciado = q.enunciado || '';
    
    // Adicionar dados de exame formatados como tabela, se existirem
    if (q.examData && q.examData.length > 0) {
      enhancedEnunciado += '\n\n<div class="exam-data">';
      enhancedEnunciado += q.examData.join(' | ');
      enhancedEnunciado += '</div>';
    }
    
    // Adicionar tabelas, se existirem
    if (q.tables && q.tables.length > 0) {
      for (const table of q.tables) {
        let tableHtml = '<table>';
        
        // Adicionar cabeçalho se houver
        if (table.rows.length > 0) {
          tableHtml += '<thead><tr>';
          for (const cell of table.rows[0]) {
            tableHtml += `<th>${cell || ''}</th>`;
          }
          tableHtml += '</tr></thead>';
        }
        
        // Adicionar corpo da tabela
        tableHtml += '<tbody>';
        for (let i = 1; i < table.rows.length; i++) {
          tableHtml += '<tr>';
          for (const cell of table.rows[i]) {
            tableHtml += `<td>${cell || ''}</td>`;
          }
          tableHtml += '</tr>';
        }
        tableHtml += '</tbody></table>';
        
        enhancedEnunciado += '\n\n' + tableHtml;
      }
    }
    
    // Adicionar imagens, se existirem
    if (q.images && q.images.length > 0) {
      for (const image of q.images) {
        let imageHtml = `<div><img src="${image.buffer}" alt="Imagem da questão ${q.numero}" /></div>`;
        enhancedEnunciado += '\n\n' + imageHtml;
      }
    }
    
    return {
      tempId: `q-${idx}`,
      numero: q.numero,
      enunciado: enhancedEnunciado,
      alternativas: q.alternativas || [],
      correta: undefined,
      dificuldade: 'MEDIUM',
      status: 'DRAFT',
      tags: ['revalida2025', 'html-extraction'],
      filterIds: [],
      subFilterIds: [],
      explicacao: '',
      isAnnulled: false,
      isOutdated: false,
      aiGenerated: false,
      aiConfidence: 0.8
    };
  });
}