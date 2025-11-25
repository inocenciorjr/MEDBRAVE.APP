import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import fs from 'fs';

interface ExtractedImage {
  id: string;
  buffer: Buffer;
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
  statement: string;
  alternatives: string[];
  tables?: string[][][];
  examData?: string[];
  images?: string[];
  // ... outros campos relevantes
}

interface ExtractedDocxResult {
  questions: ExtractedQuestion[];
  images: ExtractedImage[];
  tables: ExtractedTable[];
  structuredText: string[];
  rawText: string;
}

export async function extractQuestionsFromDocx(
  buffer: Buffer,
): Promise<ExtractedDocxResult> {
  // Extrai texto, imagens e tabelas do DOCX
  const images: ExtractedImage[] = [];
  const tables: ExtractedTable[] = [];
  const questions: ExtractedQuestion[] = [];
  const structuredText: string[] = [];

  // Usar mammoth para converter para HTML e extrair imagens
  const mammothOptions = {
    convertImage: (mammoth.images as any).inline(async (element: any) => {
      const imageBuffer = element.read();
      const id = uuidv4();
      const filename = `img-${id}.png`;
      images.push({
        id,
        buffer: Buffer.from(await imageBuffer),
        filename,
        type: element.contentType,
      });
      return {
        src: `data:${element.contentType};base64,${(await imageBuffer).toString('base64')}`,
      };
    }),
  };

  const { value: html } = await mammoth.convertToHtml(
    { buffer },
    mammothOptions,
  );
  console.log(
    '🔍 HTML gerado pelo Mammoth (primeiros 5000):',
    html.slice(0, 5000),
  );
  // Salvar HTML completo para debug
  fs.writeFileSync('mammoth_output.html', html, 'utf-8');
  console.log('✅ HTML salvo em mammoth_output.html');

  // Logar as 5 maiores imagens extraídas
  if (images.length > 0) {
    const sortedImages = images
      .slice()
      .sort((a, b) => b.buffer.length - a.buffer.length);
    sortedImages.slice(0, 5).forEach((img, idx) => {
      console.log(
        `🖼️ TOP${idx + 1} Imagem: ${img.filename}, tipo: ${img.type}, tamanho: ${img.buffer.length} bytes`,
      );
    });
  }

  // Carregar HTML no cheerio para parsing robusto
  const $ = cheerio.load(html);

  const rawText = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extrair tabelas do HTML e associá-las às questões posteriormente
  console.log('📋 Extraindo tabelas do documento...');
  const tableRegex = /<table[\s\S]*?<\/table>/g;
  const foundTableHtmls = html.match(tableRegex) || [];
  const foundTables: Array<{ html: string; rows: string[][] }> = [];

  foundTableHtmls.forEach((tableHtml, idx) => {
    const rowRegex = /<tr[\s\S]*?<\/tr>/g;
    const rows = (tableHtml.match(rowRegex) || []).map((rowHtml) => {
      const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/g;
      const cells: string[] = [];
      let match;
      while ((match = cellRegex.exec(rowHtml)) !== null) {
        cells.push(match[1].replace(/<[^>]+>/g, '').trim());
      }
      return cells;
    });

    // Armazena tanto o HTML quanto as linhas processadas
    foundTables.push({
      html: tableHtml,
      rows,
    });

    // Adiciona à lista de tabelas para o resultado final
    tables.push({
      id: `table-${idx}`,
      rows,
    });
  });

  console.log(`📊 Total de tabelas encontradas: ${foundTables.length}`);

  // PARSER ESPECIALIZADO PARA REVALIDA
  console.log('🧠 Iniciando parser especializado para REVALIDA...');
  const questionBlocks: ExtractedQuestion[] = [];

  // 1. Extrair todas as questões (títulos)
  const questionTitles: { index: number; title: string }[] = [];
  const allParagraphs = $('p').toArray();

  allParagraphs.forEach((p, index) => {
    const text = $(p).text().trim();
    if (/QUEST(Ã|A)O\s+\d+/i.test(text)) {
      questionTitles.push({ index, title: text });
      console.log(`🔍 Questão encontrada: "${text}" (índice ${index})`);
    }
  });

  // 2. Processar cada questão
  for (let i = 0; i < questionTitles.length; i++) {
    const current = questionTitles[i];
    const next =
      i < questionTitles.length - 1
        ? questionTitles[i + 1]
        : { index: allParagraphs.length };

    // Define limites da questão atual
    const startIdx = current.index;
    const endIdx = next.index;

    console.log(
      `⚙️ Processando questão ${i + 1}: "${current.title}" (índices ${startIdx}-${endIdx})`,
    );

    // Extrai parágrafos desta questão
    const questionParagraphs = allParagraphs.slice(startIdx, endIdx);
    const paragraphTexts = questionParagraphs.map((p) => $(p).text().trim());
    const paragraphHtmls = questionParagraphs.map((p) => $(p).html() || '');

    // 3. Procura alternativas - formato especial de Revalida
    const alternatives: string[] = [];
    const alternativeIndices: number[] = [];

    for (let j = 0; j < paragraphTexts.length; j++) {
      const text = paragraphTexts[j];

      // Detecta alternativas nos formatos:
      // - "A90%."
      // - "B Trata-se de recusa terapêutica"
      // - "C Diante da recusa"
      const altPattern1 = /^([A-E])\s*(.+)$/;
      const altPattern2 = /^([A-E])([0-9].+)$/;

      if (altPattern1.test(text) || altPattern2.test(text)) {
        let letter: string = '';
        let content: string = '';

        if (altPattern1.test(text)) {
          const match = text.match(altPattern1);
          if (match) {
            letter = match[1];
            content = match[2].trim();
          }
        } else {
          const match = text.match(altPattern2);
          if (match) {
            letter = match[1];
            content = match[2].trim();
          }
        }

        if (letter && content) {
          console.log(
            `📌 Alternativa detectada: ${letter} - "${content.substring(0, 30)}..."`,
          );
          alternatives.push(content);
          alternativeIndices.push(j);
        }
      }
    }

    // 4. Extrai enunciado (preservando dados de exames, mas separando-os)
    let statement = '';
    const examData: string[] = []; // Para armazenar dados de exames
    const questionTables: string[][][] = []; // Para armazenar tabelas - ajustado para string[][][]
    const questionImages: string[] = []; // Para armazenar referências a imagens

    // Cria dois grupos de parágrafos:
    // 1. Até a primeira alternativa (se houver)
    // 2. O resto (ignorado para o enunciado)
    const firstAltIdx =
      alternativeIndices.length > 0
        ? alternativeIndices[0]
        : paragraphTexts.length;
    const statementParagraphs = paragraphTexts.slice(0, firstAltIdx);
    const statementHtmls = paragraphHtmls.slice(0, firstAltIdx);

    // Processa o enunciado para extrair partes importantes
    for (let j = 0; j < statementParagraphs.length; j++) {
      const text = statementParagraphs[j];
      const html = statementHtmls[j];

      // Detecta imagens
      if (html.includes('<img') || html.includes('data:image')) {
        questionImages.push(html);
        console.log(`🖼️ Imagem detectada na questão ${i + 1}`);
      }

      // Detecta dados de exames
      if (
        /^(Exame|Parâmetro|Frequência|Pressão|Temperatura|Saturação|Hemoglobina|Hematócrito|Leucócitos|Volume|Plaquetas|Teste|Ferritina|Batimentos|Altura|Capacidade|Relação|VEF1|CVF)\b/.test(
          text,
        ) ||
        /^(Valor|Resultado|Referência)/.test(text) ||
        /^[0-9,.]+\s*(mg\/dL|g\/dL|%|bpm|mmHg|fL|pg|\/mm3?|irpm|°C|cm)$/.test(
          text,
        )
      ) {
        examData.push(text);
        console.log(
          `📊 Dado de exame detectado: "${text.substring(0, 30)}..."`,
        );
      }
      // Se for título da questão ou texto que não é dado de exame
      else if (
        /QUEST(Ã|A)O\s+\d+/i.test(text) ||
        !text.match(/^(Exame|Valor|Resultado|Referência|Parâmetro)/)
      ) {
        // Remove títulos de questão do enunciado
        if (!/QUEST(Ã|A)O\s+\d+/i.test(text)) {
          statement += (statement ? ' ' : '') + text;
        }
      }
    }

    // Processa tabelas encontradas no documento
    for (const table of foundTables) {
      // Verifica se a tabela pertence a esta questão
      // (Implementação simplificada - apenas associa se houver algum dado de exame com texto similar)
      const tableText = table.rows.flat().join(' ');
      let tableMatched = false;

      // Verifica se a tabela contém algum dos dados de exame
      for (const examLine of examData) {
        if (tableText.includes(examLine)) {
          questionTables.push([...table.rows]); // Clone para evitar referências
          console.log(
            `📋 Tabela associada à questão ${i + 1} por dados de exame`,
          );
          tableMatched = true;
          break;
        }
      }

      // Se não encontrou correspondência nos dados de exame, verifica se a tabela está próxima
      // à posição desta questão no documento HTML (heurística simplificada)
      if (!tableMatched) {
        const tablePosition = html.indexOf(table.html);
        const questionText = current.title;
        const questionPosition = html.indexOf(questionText);

        // Se a tabela aparece dentro de uma distância razoável da questão
        // (ajustar este valor conforme necessário para seu documento)
        const proximityThreshold = 5000; // caracteres

        if (Math.abs(tablePosition - questionPosition) < proximityThreshold) {
          questionTables.push([...table.rows]);
          console.log(`📋 Tabela associada à questão ${i + 1} por proximidade`);
        }
      }
    }

    // Também verifica imagens associadas por proximidade no documento HTML
    for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
      const img = images[imgIdx];

      // Busca por referências à imagem no texto HTML
      const imgRegex = new RegExp(
        `<img[^>]*src=["'][^"']*${img.id}[^"']*["'][^>]*>`,
        'i',
      );
      const imgHtmlMatch = html.match(imgRegex);

      if (imgHtmlMatch) {
        const imgHtml = imgHtmlMatch[0];
        const imgPosition = html.indexOf(imgHtml);
        const questionPosition = html.indexOf(current.title);

        // Se a imagem aparece dentro de uma distância razoável da questão
        const proximityThreshold = 10000; // caracteres

        if (Math.abs(imgPosition - questionPosition) < proximityThreshold) {
          questionImages.push(imgHtml);
          console.log(
            `🖼️ Imagem ${img.id} associada à questão ${i + 1} por proximidade`,
          );
        }
      }
    }

    // 5. Adiciona a questão extraída com todos os componentes
    if (statement || alternatives.length > 0) {
      // Se não houver enunciado textual, mas tiver dados de exame, usa os dados como parte do enunciado
      if (!statement && examData.length > 0) {
        statement = examData.join(' ');
      }

      const question: ExtractedQuestion = {
        statement: statement || current.title, // Se não houver enunciado, usa o título
        alternatives,
        examData: examData.length > 0 ? examData : undefined,
        tables: questionTables.length > 0 ? questionTables : undefined,
        images: questionImages.length > 0 ? questionImages : undefined,
      };

      // Verifica se as alternativas estão em sequência A, B, C, D, E
      const expectedAlternatives = ['A', 'B', 'C', 'D', 'E'].slice(
        0,
        alternatives.length,
      );
      let alternativesOk = true;

      // Se tivermos pelo menos duas alternativas, verificamos a sequência
      if (alternatives.length >= 2) {
        console.log(
          `   Verificando sequência de alternativas: ${alternatives.length} alternativas`,
        );

        // Ordenamos as alternativas pela letra (A, B, C, D, E)
        const alternativeMap = new Map<string, string>();
        const alternativeLetters: string[] = [];

        paragraphTexts.forEach((text) => {
          // Detecta alternativas pelos padrões identificados anteriormente
          const altPattern1 = /^([A-E])\s*(.+)$/;
          const altPattern2 = /^([A-E])([0-9].+)$/;

          let match: RegExpMatchArray | null = null;
          if (altPattern1.test(text)) {
            match = text.match(altPattern1);
          } else if (altPattern2.test(text)) {
            match = text.match(altPattern2);
          }

          if (match) {
            const letter = match[1];
            const content = match[2].trim();
            alternativeMap.set(letter, content);
            alternativeLetters.push(letter);
          }
        });

        console.log(
          `   Letras das alternativas detectadas: ${alternativeLetters.join(', ')}`,
        );

        // Verifica se as alternativas estão em ordem alfabética
        for (let k = 0; k < alternativeLetters.length - 1; k++) {
          if (
            alternativeLetters[k].charCodeAt(0) + 1 !==
            alternativeLetters[k + 1].charCodeAt(0)
          ) {
            alternativesOk = false;
            console.log(
              `⚠️ Sequência de alternativas incorreta: ${alternativeLetters.join(', ')}`,
            );
            break;
          }
        }

        // Se as alternativas não estiverem em ordem, reorganizamos
        if (!alternativesOk) {
          console.log("🔄 Reorganizando alternativas na ordem correta");
          alternatives.length = 0; // Limpa o array de alternativas

          for (const letter of expectedAlternatives) {
            if (alternativeMap.has(letter)) {
              alternatives.push(alternativeMap.get(letter)!);
            } else {
              // Se faltar alguma letra na sequência, adiciona um placeholder
              alternatives.push(`[Alternativa ${letter} não encontrada]`);
            }
          }

          console.log(
            `✅ Alternativas reorganizadas: ${alternatives.length} alternativas`,
          );
        }
      }

      questionBlocks.push(question);
      console.log(
        `✅ Questão ${i + 1} extraída com ${alternatives.length} alternativas`,
      );
      console.log(`   Enunciado: "${statement.substring(0, 50)}..."`);
      console.log(`   Dados de exame: ${examData.length}`);
      console.log(`   Tabelas: ${questionTables.length}`);
      console.log(`   Imagens: ${questionImages.length}`);

      alternatives.forEach((alt, idx) => {
        console.log(
          `   - Alt ${String.fromCharCode(65 + idx)}: "${alt.substring(0, 30)}..."`,
        );
      });
    } else {
      console.log(
        `⚠️ Questão ${i + 1} ignorada - enunciado vazio e sem alternativas`,
      );
    }
  }

  // Log do resultado final
  console.log(`📊 Total de questões encontradas: ${questionBlocks.length}`);

  // Substitui questions pelo novo parser
  questions.length = 0;
  questions.push(...questionBlocks);

  // Extrair texto estruturado
  html.replace(/<p[^>]*>(.*?)<\/p>/g, (_, text) => {
    structuredText.push(text.replace(/<[^>]+>/g, '').trim());
    return '';
  });

  return {
    questions,
    images,
    tables,
    structuredText,
    rawText,
  };
}
