// Parser Markdown → JSON para questões médicas
// Converte Markdown estruturado gerado pela IA em formato BulkQuestion

interface ExtractedImage {
  id: string;
  buffer: Buffer | string;
  filename: string;
  pageNumber?: number;
  type?: string;
  description?: string;
  dataUri?: string;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ExtractedTable {
  id: string;
  rows: string[][];
  position?: any;
  pageNumber?: number;
  html?: string;
}

interface BulkQuestion {
  id: string;
  statement: string;
  alternatives: string[];
  correctAnswer: string;
  explanation: string;
  images?: ExtractedImage[];
  tables?: ExtractedTable[];
  examData?: string[];
  year?: number;
  source?: string;
  difficulty?: 'básica' | 'intermediária' | 'avançada';
  specialty?: string;
  timeEstimate?: number;
}

interface ParsedMarkdownResult {
  questions: BulkQuestion[];
  totalQuestions: number;
  imagesFound: number;
  tablesFound: number;
  errors: string[];
  statistics: {
    averageStatementLength: number;
    questionsWithImages: number;
    questionsWithTables: number;
    questionsWithExamData: number;
  };
}

/**
 * 🚀 Parser SUPER ROBUSTO de Markdown para Questões
 */
export async function parseMarkdownToQuestions(
  markdownContent: string,
  source: string = 'REVALIDA',
): Promise<ParsedMarkdownResult> {
  console.log('📝 Iniciando parsing de Markdown para questões...');
  console.log(
    '📊 Tamanho do conteúdo:',
    markdownContent?.length || 0,
    'caracteres',
  );

  const questions: BulkQuestion[] = [];
  const errors: string[] = [];
  let imagesFound = 0;
  let tablesFound = 0;

  // Validação de entrada
  if (!markdownContent || typeof markdownContent !== 'string') {
    const error = 'Conteúdo Markdown inválido ou vazio';
    console.error('❌', error);
    return {
      questions: [],
      totalQuestions: 0,
      imagesFound: 0,
      tablesFound: 0,
      errors: [error],
      statistics: {
        averageStatementLength: 0,
        questionsWithImages: 0,
        questionsWithTables: 0,
        questionsWithExamData: 0,
      },
    };
  }

  if (markdownContent.length < 50) {
    const error = 'Conteúdo Markdown muito pequeno (mínimo 50 caracteres)';
    console.error('❌', error);
    return {
      questions: [],
      totalQuestions: 0,
      imagesFound: 0,
      tablesFound: 0,
      errors: [error],
      statistics: {
        averageStatementLength: 0,
        questionsWithImages: 0,
        questionsWithTables: 0,
        questionsWithExamData: 0,
      },
    };
  }

  try {
    // Dividir por questões usando marcador ## QUESTÃO (múltiplos padrões)
    let questionBlocks: string[] = [];

    // Tentar diferentes padrões de divisão
    const patterns = [
      /## QUESTÃO\s+(\d+)/gi,
      /##\s*QUESTÃO\s+(\d+)/gi,
      /## Questão\s+(\d+)/gi,
      /## Q(\d+)/gi,
      /(\d+)\.\s*(?=\w)/g, // Padrão "1. " seguido de palavra
    ];

    let bestSplit: string[] = [];
    let usedPattern = '';

    for (const [index, pattern] of patterns.entries()) {
      try {
        const split = markdownContent
          .split(pattern)
          .filter((block) => block?.trim());
        console.log(`🔍 Padrão ${index + 1}: ${split.length} blocos`);

        if (split.length > bestSplit.length) {
          bestSplit = split;
          usedPattern = `Padrão ${index + 1}`;
        }
      } catch (patternError) {
        console.warn(`⚠️ Erro no padrão ${index + 1}:`, patternError);
      }
    }

    questionBlocks = bestSplit;

    console.log(
      '🔍 Melhor divisão:',
      questionBlocks.length,
      'blocos usando',
      usedPattern,
    );

    if (questionBlocks.length < 2) {
      const fallbackError =
        'Nenhuma questão encontrada no formato esperado. Verifique se o Markdown contém marcadores "## QUESTÃO X"';
      console.warn('⚠️', fallbackError);
      errors.push(fallbackError);

      // Tentar fallback: dividir por quebras de linha dupla
      const fallbackBlocks = markdownContent
        .split(/\n\s*\n/)
        .filter((block) => block.trim().length > 50);
      console.log(
        `🔄 Fallback: tentando ${fallbackBlocks.length} blocos por quebras de linha`,
      );

      if (fallbackBlocks.length > 0) {
        for (let i = 0; i < Math.min(fallbackBlocks.length, 10); i++) {
          const block = fallbackBlocks[i];
          const fallbackQuestion = createFallbackQuestion(
            block,
            (i + 1).toString(),
            source,
          );
          if (fallbackQuestion) {
            questions.push(fallbackQuestion);
          }
        }
      }
    } else {
      // Processar blocos normalmente
      for (let i = 1; i < questionBlocks.length; i += 2) {
        try {
          const questionNumber =
            questionBlocks[i]?.trim() || ((i + 1) / 2).toString();
          const questionContent = questionBlocks[i + 1];

          if (!questionContent || questionContent.trim().length < 10) {
            const error = `Questão ${questionNumber}: Conteúdo insuficiente ou não encontrado`;
            errors.push(error);
            console.warn('⚠️', error);
            continue;
          }

          console.log(
            `📖 Processando QUESTÃO ${questionNumber} (${questionContent.length} chars)...`,
          );

          // Extrair componentes da questão
          const parsedQuestion = parseQuestionBlock(
            questionContent,
            questionNumber,
            source,
          );

          if (parsedQuestion) {
            questions.push(parsedQuestion);

            // Contabilizar estatísticas
            if (parsedQuestion.images && parsedQuestion.images.length > 0) {
              imagesFound += parsedQuestion.images.length;
            }
            if (parsedQuestion.tables && parsedQuestion.tables.length > 0) {
              tablesFound += parsedQuestion.tables.length;
            }

            console.log(`✅ Questão ${questionNumber} processada com sucesso`);
          } else {
            const error = `Questão ${questionNumber}: Falha no parsing - componentes insuficientes`;
            errors.push(error);
            console.warn('⚠️', error);
          }
        } catch (questionError: any) {
          const questionNum = questionBlocks[i] || 'desconhecida';
          const error = `Questão ${questionNum}: ${questionError.message}`;
          errors.push(error);
          console.error(`❌ Erro na questão ${questionNum}:`, questionError);
        }
      }
    }

    // Calcular estatísticas
    const statistics = calculateStatistics(questions);

    console.log('✅ Parsing concluído:', {
      questionsExtracted: questions.length,
      imagesFound,
      tablesFound,
      errorsCount: errors.length,
      successRate: `${Math.round((questions.length / Math.max(1, questionBlocks.length / 2)) * 100)}%`,
    });

    return {
      questions,
      totalQuestions: questions.length,
      imagesFound,
      tablesFound,
      errors,
      statistics,
    };
  } catch (error: any) {
    const criticalError = `Erro crítico no parsing: ${error.message}`;
    console.error('❌', criticalError);
    console.error('Stack trace:', error.stack);

    errors.push(criticalError);

    // Tentar uma recuperação básica
    try {
      console.log('🔄 Tentando recuperação básica...');
      const lines = markdownContent
        .split('\n')
        .filter((line) => line.trim().length > 20);

      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        const emergencyQuestion = createFallbackQuestion(
          line,
          (i + 1).toString(),
          source,
        );
        if (emergencyQuestion) {
          questions.push(emergencyQuestion);
        }
      }

      console.log(
        `🆘 Recuperação básica: ${questions.length} questões criadas`,
      );
    } catch (recoveryError) {
      console.error('❌ Falha também na recuperação básica:', recoveryError);
    }

    return {
      questions,
      totalQuestions: questions.length,
      imagesFound: 0,
      tablesFound: 0,
      errors,
      statistics: {
        averageStatementLength: 0,
        questionsWithImages: 0,
        questionsWithTables: 0,
        questionsWithExamData: 0,
      },
    };
  }
}

/**
 * 📋 Parser de bloco individual de questão
 */
function parseQuestionBlock(
  content: string,
  questionNumber: string,
  source: string,
): BulkQuestion | null {
  try {
    if (!content || content.trim().length < 20) {
      console.warn(`⚠️ Questão ${questionNumber}: Conteúdo muito pequeno`);
      return null;
    }

    // Extrair seções usando regex robustas com fallbacks
    let enunciadoMatch = content.match(/### Enunciado\s*([\s\S]*?)(?=###|$)/i);
    const imagemMatch = content.match(/### Imagem[^#]*\s*(!\[.*?\]\([^)]+\))/i);
    const tabelaMatch = content.match(/### Tabela[^#]*\s*([\s\S]*?)(?=###|$)/i);
    let alternativasMatch = content.match(
      /### Alternativas\s*([\s\S]*?)(?=###|---|\n\n|$)/i,
    );

    // Fallbacks para formatos alternativos
    if (!enunciadoMatch) {
      // Tentar sem "###"
      enunciadoMatch = content.match(
        /Enunciado[:\s]*([\s\S]*?)(?=Alternativas|Imagem|Tabela|$)/i,
      );
      if (!enunciadoMatch) {
        // Último recurso: usar primeira parte do conteúdo
        const lines = content.split('\n').filter((line) => line.trim());
        if (lines.length > 0) {
          enunciadoMatch = [content, lines.slice(0, 3).join(' ')]; // Usar primeiras 3 linhas
        }
      }
    }

    if (!alternativasMatch) {
      // Tentar sem "###"
      alternativasMatch = content.match(
        /Alternativas[:\s]*([\s\S]*?)(?=---|\n\n|$)/i,
      );
      if (!alternativasMatch) {
        // Tentar buscar diretamente por padrão A), B), C)
        const altPattern = /([A-E])\)\s*.*$/gm;
        const altMatches = content.match(altPattern);
        if (altMatches && altMatches.length >= 2) {
          alternativasMatch = [content, altMatches.join('\n')];
        }
      }
    }

    // Validar componentes obrigatórios com mais flexibilidade
    if (!enunciadoMatch || !alternativasMatch) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Componentes obrigatórios não encontrados`,
      );
      console.warn(`  - Enunciado: ${!!enunciadoMatch}`);
      console.warn(`  - Alternativas: ${!!alternativasMatch}`);

      // Tentar criar questão básica mesmo assim
      const fallbackStatement = enunciadoMatch
        ? enunciadoMatch[1].trim()
        : `Questão ${questionNumber} - enunciado não extraído corretamente`;

      const fallbackAlternatives = alternativasMatch
        ? extractAlternatives(alternativasMatch[1])
        : [
          'A) Alternativa A não extraída',
          "B) Alternativa B não extraída",
          'C) Alternativa C não extraída',
          "D) Alternativa D não extraída",
        ];

      return {
        id: generateUUID(),
        statement: fallbackStatement,
        alternatives: fallbackAlternatives,
        correctAnswer: '',
        explanation: `Questão ${questionNumber} com extração parcial de ${source} - necessita revisão`,
        source: `${source}-partial`,
        difficulty: 'intermediária',
        specialty: 'medicina_geral',
        timeEstimate: 120,
      };
    }

    let statement = enunciadoMatch[1].trim();
    const alternativasText = alternativasMatch[1].trim();

    // Validar e limpar enunciado
    if (statement.length < 10) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Enunciado muito curto (${statement.length} chars)`,
      );
      statement = `Questão ${questionNumber}: ${statement} [enunciado necessita revisão]`;
    }

    // Extrair alternativas com validação robusta
    const alternatives = extractAlternatives(alternativasText);

    if (alternatives.length < 2) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Poucas alternativas encontradas (${alternatives.length})`,
      );

      // Tentar recuperar alternativas de forma diferente
      const lines = alternativasText
        .split('\n')
        .filter((line) => line.trim().length > 5);
      const recoveredAlternatives: string[] = [];

      for (const line of lines) {
        const cleaned = line.replace(/^[A-E]\)\s*/, '').trim();
        if (cleaned) {
          recoveredAlternatives.push(cleaned);
        }
      }

      // Garantir pelo menos 4 alternativas
      while (recoveredAlternatives.length < 4) {
        recoveredAlternatives.push(
          `Alternativa ${String.fromCharCode(65 + recoveredAlternatives.length)} não extraída`,
        );
      }

      if (recoveredAlternatives.length < 2) {
        console.warn(
          `❌ Questão ${questionNumber}: Impossível extrair alternativas válidas`,
        );
        return null;
      }

      alternatives.length = 0;
      alternatives.push(...recoveredAlternatives.slice(0, 5)); // Máximo 5 alternativas
    }

    // Extrair imagens com tratamento de erro
    const images: ExtractedImage[] = [];
    if (imagemMatch) {
      try {
        const imageData = extractImageFromMarkdown(
          imagemMatch[1],
          questionNumber,
        );
        if (imageData) {
          images.push(imageData);
        }
      } catch (imageError) {
        console.warn(
          `⚠️ Questão ${questionNumber}: Erro na extração de imagem:`,
          imageError,
        );
      }
    }

    // Extrair tabelas com tratamento de erro
    const tables: ExtractedTable[] = [];
    if (tabelaMatch) {
      try {
        const tableData = extractTableFromMarkdown(
          tabelaMatch[1],
          questionNumber,
        );
        if (tableData) {
          tables.push(tableData);
        }
      } catch (tableError) {
        console.warn(
          `⚠️ Questão ${questionNumber}: Erro na extração de tabela:`,
          tableError,
        );
      }
    }

    // Extrair dados de exame do enunciado com tratamento de erro
    let examData: string[] = [];
    try {
      examData = extractExamData(statement);
    } catch (examError) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Erro na extração de dados de exame:`,
        examError,
      );
    }

    // Detectar dificuldade e especialidade com fallbacks
    let difficulty: 'básica' | 'intermediária' | 'avançada' = 'intermediária';
    let specialty = 'medicina_geral';
    let timeEstimate = 120;

    try {
      difficulty = detectDifficulty(statement, alternatives);
    } catch (difficultyError) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Erro na detecção de dificuldade:`,
        difficultyError,
      );
    }

    try {
      specialty = detectSpecialty(statement);
    } catch (specialtyError) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Erro na detecção de especialidade:`,
        specialtyError,
      );
    }

    try {
      timeEstimate = estimateTimeToSolve(statement, alternatives.length);
    } catch (timeError) {
      console.warn(
        `⚠️ Questão ${questionNumber}: Erro na estimativa de tempo:`,
        timeError,
      );
    }

    // Gerar ID único
    const id = generateUUID();

    const question: BulkQuestion = {
      id,
      statement,
      alternatives,
      correctAnswer: '', // Será definido posteriormente via gabarito
      explanation: `Questão ${questionNumber} extraída automaticamente de ${source}`,
      images: images.length > 0 ? images : undefined,
      tables: tables.length > 0 ? tables : undefined,
      examData: examData.length > 0 ? examData : undefined,
      source,
      difficulty,
      specialty,
      timeEstimate,
    };

    console.log(
      `✅ Questão ${questionNumber} extraída: ${statement.substring(0, 80)}...`,
    );

    return question;
  } catch (error: any) {
    console.error(
      `❌ Erro crítico parseando questão ${questionNumber}:`,
      error.message,
    );
    console.error('Stack trace:', error.stack);

    // Última tentativa: criar questão de emergência
    try {
      return {
        id: generateUUID(),
        statement: `Questão ${questionNumber} com erro na extração: ${error.message}`,
        alternatives: [
          'A) Erro na extração - revisar manualmente',
          'B) Erro na extração - revisar manualmente',
          'C) Erro na extração - revisar manualmente',
          'D) Erro na extração - revisar manualmente',
        ],
        correctAnswer: '',
        explanation: `Questão ${questionNumber} teve erro durante extração de ${source}. Erro: ${error.message}`,
        source: `${source}-error`,
        difficulty: 'intermediária',
        specialty: 'medicina_geral',
        timeEstimate: 120,
      };
    } catch (emergencyError) {
      console.error(
        "❌ Falha também na criação de questão de emergência:",
        emergencyError,
      );
      return null;
    }
  }
}

/**
 * 🔤 Extrair alternativas do texto
 */
function extractAlternatives(alternativasText: string): string[] {
  const alternatives: string[] = [];

  // Regex para capturar alternativas A), B), C), etc.
  const alternativeRegex = /([A-E])\)\s*(.+?)(?=[A-E]\)|$)/gs;

  let match;
  while ((match = alternativeRegex.exec(alternativasText)) !== null) {
    const text = match[2].trim();

    if (text) {
      alternatives.push(text);
    }
  }

  // Se não encontrou pelo regex, tentar divisão por linhas
  if (alternatives.length === 0) {
    const lines = alternativasText.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const cleanLine = line.replace(/^[A-E]\)\s*/, '').trim();
      if (cleanLine) {
        alternatives.push(cleanLine);
      }
    }
  }

  return alternatives;
}

/**
 * 🖼️ Extrair imagem do Markdown
 */
function extractImageFromMarkdown(
  imageMarkdown: string,
  questionNumber: string,
): ExtractedImage | null {
  try {
    const match = imageMarkdown.match(/!\[(.*?)\]\((.*?)\)/);

    if (!match) {
      return null;
    }

    const description = match[1] || `Imagem da questão ${questionNumber}`;
    const src = match[2];

    // Se for data URI, extrair dados
    if (src.startsWith('data:image/')) {
      return {
        id: generateUUID(),
        buffer: src,
        filename: `questao_${questionNumber}_img.jpg`,
        description,
        dataUri: src,
        type: 'base64',
      };
    }

    return null;
  } catch (error) {
    console.warn(
      `⚠️ Erro extraindo imagem da questão ${questionNumber}:`,
      error,
    );
    return null;
  }
}

/**
 * 📊 Extrair tabela do Markdown
 */
function extractTableFromMarkdown(
  tableMarkdown: string,
  questionNumber: string,
): ExtractedTable | null {
  try {
    const lines = tableMarkdown
      .split('\n')
      .filter((line) => line.includes('|'));

    if (lines.length < 2) {
      return null;
    }

    const rows: string[][] = [];

    for (const line of lines) {
      // Pular linha de separação (|---|---|)
      if (line.includes('---')) {
        continue;
      }

      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== '');

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      return {
        id: generateUUID(),
        rows,
        html: tableMarkdown,
      };
    }

    return null;
  } catch (error) {
    console.warn(
      `⚠️ Erro extraindo tabela da questão ${questionNumber}:`,
      error,
    );
    return null;
  }
}

/**
 * 📋 Extrair dados de exame do enunciado
 */
function extractExamData(statement: string): string[] {
  const examData: string[] = [];

  // Padrões comuns de dados de exame médico
  const patterns = [
    /PA:\s*\d+\/\d+\s*mmHg/gi,
    /FC:\s*\d+\s*bpm/gi,
    /FR:\s*\d+\s*ipm/gi,
    /T:\s*\d+[,.]?\d*\s*°?C/gi,
    /Hb:\s*\d+[,.]?\d*\s*g\/dL/gi,
    /Glicose:\s*\d+\s*mg\/dL/gi,
    /Creatinina:\s*\d+[,.]?\d*\s*mg\/dL/gi,
    /Ureia:\s*\d+\s*mg\/dL/gi,
  ];

  for (const pattern of patterns) {
    const matches = statement.match(pattern);
    if (matches) {
      examData.push(...matches);
    }
  }

  return examData;
}

/**
 * 🎯 Detectar dificuldade da questão
 */
function detectDifficulty(
  statement: string,
  alternatives: string[],
): 'básica' | 'intermediária' | 'avançada' {
  const complexWords = [
    'fisiopatologia',
    'etiopatogenia',
    'diagnóstico diferencial',
    'prognóstico',
    'farmacocinética',
    'farmacodinâmica',
  ];

  const advancedTerms = [
    'síndrome',
    'protocolo',
    'diretrizes',
    'consenso',
    'evidência',
    'meta-análise',
    'revisão sistemática',
  ];

  const fullText = (statement + ' ' + alternatives.join(' ')).toLowerCase();

  const complexWordCount = complexWords.filter((word) =>
    fullText.includes(word),
  ).length;
  const advancedTermCount = advancedTerms.filter((term) =>
    fullText.includes(term),
  ).length;

  if (advancedTermCount >= 2 || complexWordCount >= 3) {
    return 'avançada';
  } else if (complexWordCount >= 1 || advancedTermCount >= 1) {
    return 'intermediária';
  } else {
    return 'básica';
  }
}

/**
 * 🩺 Detectar especialidade médica
 */
function detectSpecialty(statement: string): string {
  const specialties = {
    cardiologia: [
      'coração',
      'cardíaco',
      'ecg',
      'eletrocardiograma',
      'infarto',
      'angina',
    ],
    pneumologia: ['pulmão', 'respiratório', 'asma', 'pneumonia', 'tuberculose'],
    neurologia: ['cérebro', 'neurológico', 'convulsão', 'epilepsia', 'avc'],
    gastroenterologia: [
      'abdome',
      'estômago',
      'intestino',
      'fígado',
      'digestivo',
    ],
    ortopedia: ['osso', 'fratura', 'articulação', 'músculo', 'trauma'],
    pediatria: ['criança', 'infantil', 'recém-nascido', 'lactente'],
    ginecologia: ['útero', 'ovário', 'menstruação', 'gravidez', 'gestação'],
  };

  const lowerStatement = statement.toLowerCase();

  for (const [specialty, keywords] of Object.entries(specialties)) {
    const matches = keywords.filter((keyword) =>
      lowerStatement.includes(keyword),
    ).length;
    if (matches >= 2) {
      return specialty;
    }
  }

  return 'clínica médica';
}

/**
 * ⏱️ Estimar tempo para resolver
 */
function estimateTimeToSolve(
  statement: string,
  alternativesCount: number,
): number {
  const baseTime = 120; // 2 minutos base
  const statementLength = statement.length;

  // +30s para cada 200 caracteres extras
  const extraTime = Math.floor(statementLength / 200) * 30;

  // +15s para cada alternativa extra (além de 4)
  const alternativeTime = Math.max(0, alternativesCount - 4) * 15;

  return baseTime + extraTime + alternativeTime;
}

/**
 * 📊 Calcular estatísticas das questões
 */
function calculateStatistics(questions: BulkQuestion[]) {
  if (questions.length === 0) {
    return {
      averageStatementLength: 0,
      questionsWithImages: 0,
      questionsWithTables: 0,
      questionsWithExamData: 0,
    };
  }

  const totalLength = questions.reduce((sum, q) => sum + q.statement.length, 0);
  const averageStatementLength = Math.round(totalLength / questions.length);

  const questionsWithImages = questions.filter(
    (q) => q.images && q.images.length > 0,
  ).length;
  const questionsWithTables = questions.filter(
    (q) => q.tables && q.tables.length > 0,
  ).length;
  const questionsWithExamData = questions.filter(
    (q) => q.examData && q.examData.length > 0,
  ).length;

  return {
    averageStatementLength,
    questionsWithImages,
    questionsWithTables,
    questionsWithExamData,
  };
}

/**
 * 🆔 Gerar UUID simples
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 🔄 Criar questão de fallback quando parsing normal falha
 */
function createFallbackQuestion(
  content: string,
  questionNumber: string,
  source: string,
): BulkQuestion | null {
  try {
    if (!content || content.trim().length < 20) {
      return null;
    }

    const trimmedContent = content.trim();

    return {
      id: generateUUID(),
      statement: `Questão ${questionNumber} (fallback): ${trimmedContent.substring(0, 300)}${trimmedContent.length > 300 ? '...' : ''}`,
      alternatives: [
        'A) Opção A - revisar manualmente',
        'B) Opção B - revisar manualmente',
        'C) Opção C - revisar manualmente',
        'D) Opção D - revisar manualmente',
      ],
      correctAnswer: '',
      explanation: `Questão criada automaticamente de ${source} - requer revisão manual completa`,
      source: `${source}-fallback`,
      difficulty: 'intermediária',
      specialty: 'medicina_geral',
      timeEstimate: 120,
    };
  } catch (error) {
    console.error('❌ Erro criando questão fallback:', error);
    return null;
  }
}

export type {
  BulkQuestion,
  ParsedMarkdownResult,
  ExtractedImage,
  ExtractedTable,
};
