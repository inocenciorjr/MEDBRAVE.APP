import { createClient } from '@supabase/supabase-js';
import { OpenRouterClient, CategorizationPrompt } from './openRouterClient';
import { FilterHierarchyManager, FilterNode } from './filterHierarchyManager';
import { createCategorizationValidator, CategorizationValidator } from './categorizationValidator';

export interface Question {
  id: string;
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta?: number | number[];
  imagem?: string;
  tempId?: string;
}

export interface CategorizationOptions {
  batchSize?: number;
  includeExplanations?: boolean;
  confidenceThreshold?: number;
  forceRecategorization?: boolean;
  jobId?: string; // ✅ Adicionar jobId
  onProgress?: (progress: number, current: number, total: number) => void;
}

export interface CategorizationResult {
  questionId: string;
  questionNumber: string;
  status: 'success' | 'failed' | 'ambiguous' | 'manual_review';
  suggestedFilters: Array<{
    filterId: string;
    filterName: string;
    confidence: number;
    reasoning: string;
  }>;
  suggestedSubfilters: Array<{
    subfilterId: string;
    subfilterName: string;
    parentPath: string[];
    confidence: number;
    reasoning: string;
  }>;
  hierarchyChain: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  aiExplanation: string;
  processingTime: number;
  imageAnalysis?: {
    detected: boolean;
    imageType: string;
    relevance: number;
  };
  overallConfidence: number;
  depthMetrics?: {
    maxDepth: number;
    avgDepth: number;
    minDepth: number;
  };
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class CategorizationService {
  private supabase: any;
  private aiClient: OpenRouterClient;
  private filterHierarchyManager: FilterHierarchyManager;
  private validator: CategorizationValidator;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    aiClient: OpenRouterClient,
    filterHierarchyManager: FilterHierarchyManager
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.aiClient = aiClient;
    this.filterHierarchyManager = filterHierarchyManager;
    this.validator = createCategorizationValidator(filterHierarchyManager);
  }

  async categorizeQuestions(
    questions: Question[],
    options: CategorizationOptions = {}
  ): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];

    // Ensure filter hierarchy is loaded
    await this.filterHierarchyManager.loadHierarchy();

    // Process questions in batches
    const batchSize = options.batchSize || 5;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await this.categorizeBatch(batch, options);
      results.push(...batchResults);
    }

    return results;
  }

  async categorizeBatch(
    batch: Question[],
    options: CategorizationOptions = {}
  ): Promise<CategorizationResult[]> {
    const startTime = Date.now();
    const maxRetries = 2; // Tentar até 3 vezes (1 tentativa inicial + 2 retries)

    // Emit event for batch start
    if (options.jobId) {
      const { jobProgressEmitter } = await import('./jobProgressEmitter');
      jobProgressEmitter.emitCategorization(
        options.jobId,
        'categorizing',
        `Categorizando lote de ${batch.length} questões: ${batch.map(q => q.numero).join(', ')}`
      );
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.warn(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1} para categorizar batch de ${batch.length} questões`);
        }

        // Build prompt for batch
        const prompt = await this.buildCategorizationPrompt(batch);

        // Call AI with dynamic token calculation
        const aiResponse = await this.aiClient.categorize(prompt, batch.length);

        // Log token usage metrics
        if (aiResponse.metadata) {
          const meta = aiResponse.metadata;
          console.log(`📊 AI Token Usage for batch of ${batch.length} questions:`);
          if (meta.tokensUsed !== undefined) {
            console.log(`   🔢 Total: ${meta.tokensUsed} tokens`);
          }
        }

        // ✅ VALIDAÇÃO CRÍTICA: Verificar se todas as questões foram categorizadas
        if (aiResponse.categorizations.length !== batch.length) {
          const error = `❌ ERRO: IA retornou ${aiResponse.categorizations.length} categorizações, mas esperava ${batch.length}!`;
          console.error(error);
          console.error(`Questões esperadas: ${batch.map(q => q.numero).join(', ')}`);
          console.error(`Categorizações recebidas: ${aiResponse.categorizations.length}`);

          // Tentar identificar quais questões foram categorizadas
          const categorizedIds = new Set(aiResponse.categorizations.map((c: any) => c.questionId));
          const missingQuestions = batch.filter(q => {
            const qId = q.id || q.tempId || q.numero;
            return !categorizedIds.has(qId);
          });

          console.error(`❌ Questões NÃO categorizadas: ${missingQuestions.map(q => q.numero).join(', ')}`);

          // Se ainda temos tentativas, fazer retry
          if (attempt < maxRetries) {
            console.warn(`⚠️ Tentando novamente... (tentativa ${attempt + 2}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s antes de tentar novamente
            continue; // Tentar novamente
          }

          // Se esgotamos as tentativas, lançar erro
          throw new Error(`IA não categorizou todas as questões após ${maxRetries + 1} tentativas. Esperado: ${batch.length}, Recebido: ${aiResponse.categorizations.length}. Questões faltando: ${missingQuestions.map(q => q.numero).join(', ')}`);
        }

        console.log(`✅ Validação OK: IA categorizou todas as ${batch.length} questões do batch`);

        // Process results
        const results: CategorizationResult[] = [];
        for (let i = 0; i < aiResponse.categorizations.length; i++) {
          let categorization = aiResponse.categorizations[i];
          // Match by index since questionId is unreliable
          const question = batch[i];
          if (!question) {
            console.warn(`Question not found at index ${i}`);
            continue;
          }

          // console.log(`✅ Matched categorization to question ${question.numero}`);

          // Override questionId with actual identifier
          categorization.questionId = question.id || question.tempId || question.numero;

          // Map AI response fields to expected format
          // Processar filtros que contêm " > " (expandir em filtro + subfiltros)
          const mappedFilters: any[] = [];
          const filtersToExpand: any[] = [];

          (categorization.filters || []).forEach((f: any) => {
            const name = f.name || f.filterName;
            if (name && name.includes(' > ')) {
              console.warn(`⚠️ Filtro com caminho completo: ${name} - será expandido`);
              filtersToExpand.push(f);
            } else {
              mappedFilters.push({
                filterId: f.id || f.filterId,
                filterName: name,
                confidence: f.confidence,
                reasoning: f.reasoning,
              });
            }
          });

          // Expandir subfiltros que contêm caminho completo
          // Ex: "Cirurgia > Urgências Abdominais > Colecistite Aguda"
          // Adiciona "Cirurgia" aos filters e cria subfiltros para cada nível
          const expandedSubfilters: any[] = [];
          const additionalFilters: any[] = [];

          // Processar filtros que precisam ser expandidos
          filtersToExpand.forEach((f: any) => {
            const name = f.name || f.filterName;
            const parts = name.split(' > ');

            // Primeiro elemento é o filtro raiz
            // NÃO adicionar automaticamente - a IA deve retornar o filtro raiz com ID correto
            // Se não retornou, é um erro da IA que deve ser corrigido no prompt
            const rootFilterName = parts[0].trim();
            console.warn(`⚠️ Filtro com caminho completo detectado: ${name}`);
            console.warn(`⚠️ A IA deveria ter retornado "${rootFilterName}" como filtro separado com ID correto`);

            // Criar subfiltros para cada nível subsequente
            for (let i = 1; i < parts.length; i++) {
              const subName = parts[i].trim();
              const parentPath = parts.slice(0, i).map((p: string) => p.trim());

              expandedSubfilters.push({
                subfilterId: f.id || f.filterId,
                subfilterName: subName,
                parentPath,
                confidence: f.confidence,
                reasoning: i === parts.length - 1 ? f.reasoning : '',
              });
            }
          });

          // Processar subfiltros normais
          (categorization.subfilters || []).forEach((sf: any) => {
            let subfilterName = sf.name || sf.subfilterName;

            // Se o nome contém " > ", expandir em múltiplos subfiltros
            if (subfilterName && subfilterName.includes(' > ')) {
              const parts = subfilterName.split(' > ');

              // Primeiro elemento é o filtro raiz
              // NÃO adicionar automaticamente - a IA deve retornar o filtro raiz com ID correto
              const rootFilterName = parts[0].trim();
              console.warn(`⚠️ Subfiltro com caminho completo detectado: ${name}`);
              console.warn(`⚠️ A IA deveria ter retornado "${rootFilterName}" como filtro separado com ID correto`);

              // Criar um subfiltro para cada nível subsequente
              for (let i = 1; i < parts.length; i++) {
                const name = parts[i].trim();
                const parentPath = parts.slice(0, i).map((p: string) => p.trim());

                expandedSubfilters.push({
                  subfilterId: sf.id || sf.subfilterId,
                  subfilterName: name,
                  parentPath,
                  confidence: sf.confidence,
                  reasoning: i === parts.length - 1 ? sf.reasoning : '',
                });
              }
            } else {
              // Subfiltro simples - EXPANDIR os níveis intermediários usando parent_id
              const parentPath = sf.parentPath || [];
              const subfilterId = sf.id || sf.subfilterId;

              // Se tem parentPath com mais de 1 nível, buscar os IDs corretos dos intermediários
              if (parentPath.length > 1) {
                // Buscar o nó do subfiltro final na hierarquia para pegar o parent_id
                const finalNode = this.filterHierarchyManager.getNodeById(subfilterId);

                if (finalNode && finalNode.parentId) {
                  // Reconstruir a cadeia de pais usando parent_id
                  const parentChain: FilterNode[] = [];
                  let currentNode = this.filterHierarchyManager.getNodeById(finalNode.parentId);

                  while (currentNode) {
                    parentChain.unshift(currentNode); // Adicionar no início para manter ordem
                    currentNode = currentNode.parentId ? this.filterHierarchyManager.getNodeById(currentNode.parentId) : null;
                  }

                  // Adicionar cada nó da cadeia como subfiltro (exceto o filtro raiz que já está em filters)
                  parentChain.forEach((node, index) => {
                    if (node.level > 0) { // Apenas subfiltros (level > 0), não filtros raiz
                      const nodeParentPath = parentChain.slice(0, index).map(n => n.name);

                      // console.log(`🔧 Expandindo subfiltro intermediário: ${node.name} (ID: ${node.id}, level: ${node.level})`);

                      expandedSubfilters.push({
                        subfilterId: node.id,
                        subfilterName: node.name,
                        parentPath: nodeParentPath,
                        confidence: sf.confidence,
                        reasoning: '',
                      });
                    }
                  });
                } else {
                  console.warn(`⚠️ Não foi possível expandir subfiltros intermediários para ${subfilterName} (ID: ${subfilterId})`);
                }
              }

              // Adicionar o subfiltro final
              expandedSubfilters.push({
                subfilterId,
                subfilterName,
                parentPath,
                confidence: sf.confidence,
                reasoning: sf.reasoning,
              });
            }
          });

          const mappedSubfilters = expandedSubfilters;

          // Adicionar filtros raiz extraídos dos caminhos completos
          mappedFilters.push(...additionalFilters);

          (categorization as any).filters = mappedFilters;
          (categorization as any).subfilters = mappedSubfilters;

          // ✅ VALIDAÇÃO RIGOROSA: Verificar IDs contra o banco e remover duplicatas
          const validationResult = this.validator.validate({
            suggestedFilters: mappedFilters,
            suggestedSubfilters: mappedSubfilters,
          });

          if (!validationResult.isValid) {
            console.error(`❌ Questão ${question.numero}: Categorização inválida`, validationResult.errors);
            // Usar versão limpa mesmo com erros
          }

          if (validationResult.warnings.length > 0) {
            console.warn(`⚠️ Questão ${question.numero}:`, validationResult.warnings);
          }

          // Usar filtros e subfiltros validados e limpos
          (categorization as any).filters = validationResult.cleanedFilters;
          (categorization as any).subfilters = validationResult.cleanedSubfilters;

          // Silencioso - não loga para evitar poluição

          // Eliminate redundancies - DESABILITADO para manter todos os níveis explícitos
          // const cleanedCategorization = this.eliminateRedundancies(categorization);
          // categorization.filters = cleanedCategorization.filters;
          // categorization.subfilters = cleanedCategorization.subfilters;
          // console.log(`🔧 Redundancy elimination DISABLED - keeping all hierarchy levels explicit`);
          // console.log(`✅ Duplicates ALLOWED - interdisciplinary questions can have same filter in multiple paths`);

          // Validate depth
          const depthValidation = this.validateDepth(categorization);

          // Build hierarchy chain
          const hierarchyChain = this.buildHierarchyChain(mappedSubfilters);

          // Determine status based on depth and confidence
          const overallConfidence = categorization.overallConfidence || 0;
          let status: CategorizationResult['status'] = 'success';

          // Check depth first - MAIS RIGOROSO
          if (depthValidation.depth < 3) {
            console.warn(`⚠️ Questão ${question.numero}: Profundidade muito rasa (${depthValidation.depth}) - marcando para revisão manual`);
            status = 'manual_review';
          } else if (depthValidation.depth === 3 && overallConfidence < 70) {
            status = 'ambiguous';
          } else if (overallConfidence < (options.confidenceThreshold || 60)) {
            status = 'ambiguous';
          }

          // No categorization at all
          if (categorization.filters.length === 0 && categorization.subfilters.length === 0) {
            status = 'manual_review';
          }

          // Muito poucos subfiltros (menos de 2) = suspeito
          if (mappedSubfilters.length < 2) {
            console.warn(`⚠️ Questão ${question.numero}: Apenas ${mappedSubfilters.length} subfiltro(s) - pode estar incompleto`);
          }

          // Analyze image if present
          let imageAnalysis = undefined;
          if (question.imagem) {
            try {
              const analysis = await this.aiClient.analyzeImage(
                question.imagem,
                question.enunciado.substring(0, 200) // Context from question
              );
              imageAnalysis = {
                detected: true,
                imageType: analysis.imageType || 'Desconhecido',
                relevance: analysis.relevance || 0,
              };
              console.log(`🖼️ Image analyzed: type=${imageAnalysis.imageType}, relevance=${imageAnalysis.relevance}%`);
            } catch (error) {
              console.warn(`⚠️ Failed to analyze image for question ${question.numero}:`, error);
              imageAnalysis = {
                detected: false,
                imageType: 'Erro na análise',
                relevance: 0,
              };
            }
          }

          const finalQuestionId = question.id || question.tempId || question.numero || `fallback-${Date.now()}-${i}`;

          if (!question.id && !question.tempId) {
            console.warn(`⚠️ Question ${question.numero} has no id or tempId, using fallback: ${finalQuestionId}`);
          }

          results.push({
            questionId: finalQuestionId,
            questionNumber: question.numero,
            status,
            suggestedFilters: mappedFilters,
            suggestedSubfilters: mappedSubfilters,
            hierarchyChain,
            aiExplanation: categorization.explanation || '',
            processingTime: Date.now() - startTime,
            imageAnalysis,
            overallConfidence,
            depthMetrics: {
              maxDepth: depthValidation.depth,
              avgDepth: depthValidation.avgDepth,
              minDepth: depthValidation.minDepth,
            },
          });

          // Emit event for each question categorized
          if (options.jobId) {
            const { jobProgressEmitter } = await import('./jobProgressEmitter');
            jobProgressEmitter.emitCategorization(
              options.jobId,
              'categorized',
              `✅ Categorizada: ${question.numero} (${mappedFilters.length} filtros, ${mappedSubfilters.length} subfiltros)`,
              i + 1,
              batch.length
            );
          }
        }

        // ✅ Sucesso! Todas as questões foram categorizadas
        return results;

      } catch (error) {
        console.error(`❌ Erro na tentativa ${attempt + 1}/${maxRetries + 1}:`, error);

        // Se ainda temos tentativas e o erro não é de validação, fazer retry
        if (attempt < maxRetries && !(error instanceof Error && error.message.includes('não categorizou todas as questões'))) {
          console.warn(`⚠️ Tentando novamente após erro... (tentativa ${attempt + 2}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2s antes de tentar novamente
          continue;
        }

        // Se esgotamos as tentativas ou é erro de validação, propagar o erro
        console.error(`❌ Falha após ${attempt + 1} tentativa(s)`);
        throw error;
      }
    }

    // Se chegou aqui, esgotamos todas as tentativas sem sucesso
    throw new Error(`Falha ao categorizar batch após ${maxRetries + 1} tentativas`);
  }

  private async buildCategorizationPrompt(batch: Question[]): Promise<CategorizationPrompt> {
    // Get compact hierarchy representation
    const filterHierarchy = this.filterHierarchyManager.getCompactRepresentationForAI();

    // Log questions being sent
    console.log(`📝 Processing batch: ${batch.length} questions (${batch.map(q => q.numero).join(', ')})`)
    batch.forEach((q, idx) => {
      const qId = q.id || q.tempId || 'no-id';
      console.log(`  Q${idx + 1}: id=${q.id}, tempId=${q.tempId}, numero=${q.numero}, using=${qId}`);
    });

    // Build system prompt
    const systemPrompt = `Você é um especialista em categorização de questões médicas. Sua tarefa é categorizar questões de provas médicas na taxonomia hierárquica fornecida.

⚠️ CONTEXTO IMPORTANTE:
- Existem MAIS DE 1000 FILTROS na hierarquia
- Você tem 200K tokens de entrada e 128K de saída - USE TODA ESSA CAPACIDADE
- NÃO seja preguiçoso ou econômico - categorize COMPLETAMENTE
- Haverá validação manual no final - se não fizer direito, terá que REFAZER TUDO

INSTRUÇÕES CRÍTICAS - RACIOCÍNIO OBRIGATÓRIO:

1. PENSE ANTES DE CATEGORIZAR (PROCESSO DE RACIOCÍNIO):
   
   PASSO 1: ANÁLISE DA QUESTÃO
   - Leia a questão COMPLETAMENTE
   - Identifique o TEMA PRINCIPAL (ex: pneumonia, diabetes, trauma)
   - Identifique o CONTEXTO (ex: adulto, criança, gestante, pós-operatório, idoso, morador de rua)
   - Identifique o FOCO (ex: diagnóstico, tratamento, complicações, prevenção, conduta, fatores de risco, agente etiológico, exames)
   
   PASSO 2: DETERMINE SE É MULTIDISCIPLINAR
   - A questão envolve REALMENTE mais de uma especialidade?
   - Exemplos de questões MONODISCIPLINARES:
     * Pneumonia em adulto = APENAS Clínica Médica > Pneumologia
     * Apendicite aguda = APENAS Cirurgia > Urgências Abdominais
     * Varicela em criança = APENAS Pediatria > Infectologia Pediátrica
   - Exemplos de questões MULTIDISCIPLINARES:
     * Pneumonia em criança de 4 anos = Clínica Médica > Pneumologia + Pediatria > Pneumologia Pediátrica
     * Diabetes gestacional = Clínica Médica > Endocrinologia > Diabetes + Ginecologia > Alto Risco + Ginecologia + Diabetes Gestacional
     * Leptospirose + vigilância epidemiológica = Clínica Médica > Infectologia > lepitospirose + Medicina Preventiva > saúde coletiva
   
   PASSO 3: BUSQUE FILTROS CORRESPONDENTES
   - Para CADA especialidade identificada, busque na hierarquia
   - Se encontrar subfiltro específico, adicione ele e todo o caminho da hierarquia. 
    *Exemplos:
    Se encontrar Clínica médica > Cardiologia > Taquiarritmias > Fibrilação Atrial > Tratamento
    E a questão for de tratamento de uma fibrilação atrial, então você deverá adicionar: Tratamento + fibrilação atrial + taquiarritmias + cardiologia + clínica médica
   - Se NÃO encontrar subfiltro específico, adicione apenas o filtro mais próximo
   - NÃO invente filtros que não existem na hierarquia

2. REGRAS DE MULTIDISCIPLINARIDADE:
   
   ✅ ADICIONE MÚLTIPLAS ESPECIALIDADES APENAS SE:
   - A questão EXPLICITAMENTE envolve mais de uma especialidade
   - Exemplo: "Criança de 4 anos com pneumonia" → Pediatria + Clínica Médica
   - Exemplo: "Gestante com diabetes" → Ginecologia + Clínica Médica
   - Exemplo: "Leptospirose e notificação compulsória" → Clínica Médica + Medicina Preventiva
   
   ❌ NÃO ADICIONE MÚLTIPLAS ESPECIALIDADES SE:
   - A questão é claramente de UMA especialidade apenas
   - Exemplo: "Adulto com pneumonia" → APENAS Clínica Médica (NÃO adicionar Cirurgia, Pediatria, etc.)
   - Exemplo: "Apendicite aguda" → APENAS Cirurgia (NÃO adicionar Clínica Médica)
   - Exemplo: "Varicela em criança" → APENAS Pediatria (NÃO adicionar Clínica Médica)
   
   🎯 BUSQUE SUBFILTROS CORRESPONDENTES:
   - Se identificou "Pneumonia" em Pediatria, busque "Pediatria > Pneumologia Pediátrica > Pneumonia"
   - Se NÃO encontrar subfiltro específico, use o mais próximo disponível
   - Se encontrar "Leptospirose" em Clínica Médica mas NÃO em Medicina Preventiva, adicione Clínica Médica e Lepitospirose, mas em medicina preventiva adicione apenas "Medicina Preventiva" (sem subfiltro)

3. PROFUNDIDADE MÁXIMA (CRÍTICO - NUNCA IGNORE):
   - Explore TODA a hierarquia até o nível mais profundo disponível
   - Se existe "Clínica Médica > Endocrinologia > Diabetes > Insulinoterapia", vá até o último nível
   - NUNCA pare em níveis intermediários se existem subfiltros mais específicos
   - A hierarquia pode ter até 8 níveis - explore TODOS os níveis disponíveis
   - Profundidade mínima OBRIGATÓRIA: 3 níveis por caminho, se existir. 
   - Profundidade ideal: 4-6 níveis por caminho
   - MANTENHA A MESMA PROFUNDIDADE EM TODAS AS QUESTÕES DO BATCH

4. ADICIONE TODOS OS NÍVEIS INTERMEDIÁRIOS COM IDs CORRETOS:
   - Se você identificou "Insulinoterapia" (nível 4), você DEVE adicionar:
     * Filtro raiz: "Clínica Médica" (nível 1) - busque o ID correto na hierarquia
     * Subfiltro: "Endocrinologia" (nível 2) - busque o ID correto na hierarquia
     * Subfiltro: "Diabetes" (nível 3) - busque o ID correto na hierarquia
     * Subfiltro: "Insulinoterapia" (nível 4) - busque o ID correto na hierarquia
   - CADA nível deve ser adicionado INDIVIDUALMENTE com seu ID REAL do banco de dados
   - NÃO pule níveis intermediários
   - NÃO invente IDs - use APENAS os IDs mostrados na hierarquia fornecida
   - CRÍTICO: Filtros raiz vão no array "filters", subfiltros vão no array "subfilters"

5. PRIORIZAÇÃO DA RESPOSTA CORRETA:
   - A resposta correta tem peso 80% na categorização
   - Alternativas incorretas têm peso 20% (apenas para contexto adicional)
   - Foque na condição/conhecimento testado pela resposta correta
   - Mas também considere o contexto das alternativas para identificar outros ângulos

6. ELIMINAÇÃO DE REDUNDÂNCIAS:
   - NUNCA repita o MESMO subfiltro múltiplas vezes se o parentPath for o mesmo
   - Se já adicionou "Endocrinologia" com parentPath ["Clínica Médica"], não adicione novamente
   - Mas você PODE ter "Endocrinologia" em diferentes caminhos (ex: Clínica Médica e Pediatria), então os dois "endocrinologia" devem ser adicionados
   - Isso é válido para todos os subfiltros.

7. EXPLICAÇÕES E RACIOCÍNIO:
   - Não faça explicações, utilize todo seu contexto para raciocinar e categorizar corretamente cada questão do Batch.
   - Não precisa haver explicações na sua resposta, retorne APENAS com os filtros e subfiltros de cada questão.
   - Ou seja, voce deve raciocinar, pensar e construir uma linha lógica, mas isso naõ deve ser externado. 
   - PRIORIDADE: Categorizar COMPLETAMENTE e profundamente
   - Use português brasileiro (não inglês)
   - Seja claro e preciso

8. ANÁLISE DE IMAGENS:
   - Se imagem presente, analise e identifique tipo (ECG, Raio-X, TC, RM, etc.)
   - Calcule relevância (0-100%)
   - Inclua achados na categorização

FORMATO DE RESPOSTA (JSON):

⚠️⚠️⚠️ CRÍTICO - VOCÊ DEVE RETORNAR UM ARRAY COM EXATAMENTE ${batch.length} OBJETOS ⚠️⚠️⚠️
⚠️⚠️⚠️ SE RETORNAR MENOS, O PROCESSO SERÁ CANCELADO E VOCÊ TERÁ QUE REFAZER TUDO ⚠️⚠️⚠️

FORMATO OBRIGATÓRIO - RETORNE APENAS O JSON, SEM TEXTO ANTES OU DEPOIS:

\`\`\`json
[
  {
    "questionId": "id_ou_tempId_da_questao",
    "filters": [
      {
        "filterId": "ClinicaMedica",
        "filterName": "Clínica Médica",
        "confidence": 95,
        "reasoning": "Curto" 
      }
    ],
    "subfilters": [
      {
        "subfilterId": "ClinicaMedica_Endocrinologia",
        "subfilterName": "Endocrinologia",
        "parentPath": ["Clínica Médica"],
        "confidence": 95,
        "reasoning": "Curto"
      },
      {
        "subfilterId": "ClinicaMedica_Endocrinologia_Diabetes",
        "subfilterName": "Diabetes",
        "parentPath": ["Clínica Médica", "Endocrinologia"],
        "confidence": 95,
        "reasoning": "Curto"
      }
    ],
    "overallConfidence": 90,
    "explanation": "Breve",
    "imageInfluence": 20,
    "answerKeyInfluence": 80
  },
  ... (REPITA PARA TODAS AS ${batch.length} QUESTÕES)
]
\`\`\`

⚠️ REGRAS CRÍTICAS:
1. Retorne APENAS o bloco JSON acima, dentro de \`\`\`json
2. NÃO adicione texto explicativo antes ou depois do JSON
3. Você DEVE retornar EXATAMENTE ${batch.length} objetos no array
4. FILTERS: Apenas filtros raiz (ex: "ClinicaMedica", "Cirurgia", "Pediatria")
5. SUBFILTERS: Todos os subfiltros (ex: "ClinicaMedica_Endocrinologia")
6. NÃO coloque "Endocrinologia" em filters - é subfiltro! Os filtros principais são apenas Clínica Médica, Cirurgia, Pediatria, Ginecologia, Obstetrícia, Medicina Preventiva. as Subespecialidades já são subfiltros.
7. Use APENAS IDs que EXISTEM na hierarquia fornecida

REGRAS CRÍTICAS SOBRE IDs (LEIA COM ATENÇÃO):

1. ✅ Use APENAS os IDs EXATOS mostrados na hierarquia acima (antes dos dois pontos ":")
2. ❌ NUNCA invente IDs - se não encontrar o ID exato, NÃO use
3. ✅ Exemplo: Se a hierarquia mostra "abc-123: Clínica Médica > Hematologia", use "abc-123"
4. ✅ FILTERS (array "filters"): Use APENAS IDs de FILTROS RAIZ (level 0, sem ">" no caminho)
   - Exemplo: "ClinicaMedica", "Cirurgia", "Pediatria"
   - ❌ NÃO coloque "Endocrinologia" em filters - é subfiltro!
   - ❌ NÃO coloque "Dermatologia" em filters - é subfiltro!
5. ✅ SUBFILTERS (array "subfilters"): Use IDs de SUBFILTROS (level > 0, com ">" no caminho)
   - Exemplo: "ClinicaMedica_Endocrinologia", "ClinicaMedica_Dermatologia"
6. ✅ Se "Clínica Médica" é raiz (level 0) e "Hematologia" é filho (level 1+):
   - "ClinicaMedica" vai em filters
   - "ClinicaMedica_Hematologia" vai em subfilters
7. ❌ NUNCA coloque o mesmo item em filters E subfilters
8. ❌ NUNCA invente IDs como "ClinicaMedica_Farmacodermias" se não estiver na hierarquia
9. ✅ Se não encontrar o ID exato, busque o ID mais próximo que EXISTE na hierarquia

IMPORTANTE: 
- FOCO TOTAL em categorizar corretamente e profundamente
- Use IDs REAIS do banco - NUNCA invente IDs
- Use TODO o contexto disponível (200k input, 128k output)
- Adicione TODOS os filtros e subfiltros relevantes`;

    // Adicionar exemplo de categorização profunda e interdisciplinar
    const examplePrompt = `
EXEMPLOS DE CATEGORIZAÇÃO (SIGA ESTES PADRÕES):

═══════════════════════════════════════════════════════════════════════════════
EXEMPLO 1: QUESTÃO MONODISCIPLINAR (1 especialidade)
═══════════════════════════════════════════════════════════════════════════════

Questão: "Paciente adulto com pneumonia adquirida na comunidade. Qual antibiótico?"

RACIOCÍNIO:
- Tema: Pneumonia
- Contexto: Adulto (NÃO é criança, NÃO é gestante)
- Foco: Tratamento
- Especialidades: APENAS Clínica Médica (não envolve Pediatria, Cirurgia, etc.)

{
  "questionId": "exemplo-001",
  "filters": [
    {
      "filterId": "ClinicaMedica",
      "filterName": "Clínica Médica",
      "confidence": 95,
      "reasoning": "Questão de pneumonia em adulto"
    }
  ],
  "subfilters": [
    {
      "subfilterId": "ClinicaMedica_Pneumologia",
      "subfilterName": "Pneumologia",
      "parentPath": ["Clínica Médica"],
      "confidence": 95,
      "reasoning": ""
    },
    {
      "subfilterId": "ClinicaMedica_Pneumologia_PneumoniaAdquiridaNaComunidade",
      "subfilterName": "Pneumonia Adquirida na Comunidade",
      "parentPath": ["Clínica Médica", "Pneumologia"],
      "confidence": 95,
      "reasoning": "Tema específico da questão"
    },
    {
      "subfilterId": "ClinicaMedica_Pneumologia_PneumoniaAdquiridaNaComunidade_Tratamento",
      "subfilterName": "Tratamento",
      "parentPath": ["Clínica Médica", "Pneumologia", "Pneumonia Adquirida na Comunidade"],
      "confidence": 95,
      "reasoning": "Foco em antibioticoterapia"
    }
  ],
  "overallConfidence": 95,
  "explanation": "Questão objetivamente de Clínica Médica - Pneumologia",
  "imageInfluence": 0,
  "answerKeyInfluence": 80
}

═══════════════════════════════════════════════════════════════════════════════
EXEMPLO 2: QUESTÃO MULTIDISCIPLINAR (2 especialidades)
═══════════════════════════════════════════════════════════════════════════════

Questão: "Criança de 4 anos com pneumonia. Qual antibiótico?"

RACIOCÍNIO:
- Tema: Pneumonia
- Contexto: Criança de 4 anos (idade pediátrica!)
- Foco: Tratamento
- Especialidades: Pediatria (idade) + Clínica Médica (doença base)

{
  "questionId": "exemplo-002",
  "filters": [
    {
      "filterId": "Pediatria",
      "filterName": "Pediatria",
      "confidence": 95,
      "reasoning": "Paciente pediátrico (4 anos)"
    },
    {
      "filterId": "ClinicaMedica",
      "filterName": "Clínica Médica",
      "confidence": 90,
      "reasoning": "Doença respiratória"
    }
  ],
  "subfilters": [
    {
      "subfilterId": "Pediatria_PneumologiaPediatrica",
      "subfilterName": "Pneumologia Pediátrica",
      "parentPath": ["Pediatria"],
      "confidence": 95,
      "reasoning": "Pneumonia em criança"
    },
    {
      "subfilterId": "Pediatria_PneumologiaPediatrica_Pneumonia",
      "subfilterName": "Pneumonia",
      "parentPath": ["Pediatria", "Pneumologia Pediátrica"],
      "confidence": 95,
      "reasoning": "Tema específico"
    },
    {
      "subfilterId": "ClinicaMedica_Pneumologia",
      "subfilterName": "Pneumologia",
      "parentPath": ["Clínica Médica"],
      "confidence": 90,
      "reasoning": "Doença respiratória"
    },
    {
      "subfilterId": "ClinicaMedica_Pneumologia_PneumoniaAdquiridaNaComunidade",
      "subfilterName": "Pneumonia Adquirida na Comunidade",
      "parentPath": ["Clínica Médica", "Pneumologia"],
      "confidence": 90,
      "reasoning": "Contexto da doença"
    }
  ],
  "overallConfidence": 95,
  "explanation": "Questão multidisciplinar: Pediatria (idade) + Clínica Médica (doença)",
  "imageInfluence": 0,
  "answerKeyInfluence": 80
}

═══════════════════════════════════════════════════════════════════════════════
EXEMPLO 3: QUESTÃO COM SUBFILTRO PARCIAL
═══════════════════════════════════════════════════════════════════════════════

Questão: "Leptospirose e notificação compulsória. Qual conduta?"

RACIOCÍNIO:
- Tema: Leptospirose + Vigilância Epidemiológica
- Contexto: Saúde pública
- Especialidades: Clínica Médica (doença) + Medicina Preventiva (notificação)
- Observação: Leptospirose existe em Clínica Médica, mas não existe vigilância epidemiológica em Medicina Preventiva

{
  "questionId": "exemplo-003",
  "filters": [
    {
      "filterId": "ClinicaMedica",
      "filterName": "Clínica Médica",
      "confidence": 95,
      "reasoning": "Doença infecciosa"
    },
    {
      "filterId": "MedicinaPreventiva",
      "filterName": "Medicina Preventiva",
      "confidence": 90,
      "reasoning": "Notificação compulsória"
    }
  ],
  "subfilters": [
    {
      "subfilterId": "ClinicaMedica_Infectologia",
      "subfilterName": "Infectologia",
      "parentPath": ["Clínica Médica"],
      "confidence": 95,
      "reasoning": ""
    },
    {
      "subfilterId": "ClinicaMedica_Infectologia_Leptospirose",
      "subfilterName": "Leptospirose",
      "parentPath": ["Clínica Médica", "Infectologia"],
      "confidence": 95,
      "reasoning": "Doença específica"
    }
    // Mesmo não encontrando Id pra VigilÂncia Epidemiológica em Medicina Preventiva, adicione o filtro PAI. 
    // Apenas o filtro "Medicina Preventiva" já foi adicionado acima
  ],
  "overallConfidence": 90,
  "explanation": "Leptospirose (Clínica Médica) + Vigilância (Medicina Preventiva sem subfiltro específico)",
  "imageInfluence": 0,
  "answerKeyInfluence": 80
}

IMPORTANTE: TODAS as questões devem ter profundidade similar ao exemplo acima (3-6 níveis).

AGORA CATEGORIZE AS SEGUINTES QUESTÕES COM A MESMA PROFUNDIDADE DO EXEMPLO:
`;

    // Build user prompt with questions
    const questionsText = batch.map((q, idx) => {
      const correctAnswer = Array.isArray(q.correta) ? q.correta : [q.correta];
      const correctAnswerText = correctAnswer
        .filter(c => c !== undefined)
        .map(c => q.alternativas[c!])
        .join(', ');

      // Adicionar lembrete de profundidade a cada 2 questões
      const depthReminder = idx > 0 && idx % 2 === 0
        ? '\n⚠️ LEMBRETE: Mantenha a profundidade de 3-6 níveis como no exemplo acima!\n\n'
        : '';

      return depthReminder + `
QUESTÃO ${idx + 1} (ID: ${q.id || q.tempId}):
Número: ${q.numero}
Enunciado: ${q.enunciado}

Alternativas:
${q.alternativas.map((alt, i) => `${i}. ${alt}`).join('\n')}

Índice da Resposta Correta: ${q.correta !== undefined ? q.correta : 'Não fornecido'}
Texto da Resposta Correta: ${correctAnswerText || 'Não fornecido'}

Possui Imagem: ${q.imagem ? 'Sim' : 'Não'}
${q.imagem ? `URL da Imagem: ${q.imagem}` : ''}
`;
    }).join('\n---\n');

    const userPrompt = examplePrompt + `

HIERARQUIA DE FILTROS:
${filterHierarchy}

QUESTÕES PARA CATEGORIZAR:
${questionsText}

⚠️⚠️⚠️ CRÍTICO - LEIA COM ATENÇÃO ⚠️⚠️⚠️

1. MÚLTIPLOS FILTROS PRINCIPAIS:
   - NÃO se limite a 1 filtro principal - busque TODOS os ângulos (2-5+ filtros principais)
   - Questões são INTERDISCIPLINARES - explore todas as especialidades relevantes
   - Exemplo: Diabetes na infância = Clínica Médica + Pediatria (2 filtros principais)

2. BUSQUE TODAS AS OCORRÊNCIAS:
   - Se menciona "Diabetes", busque em TODA a hierarquia (Clínica Médica, Pediatria, GO, etc.)
   - NÃO pare na primeira correspondência - continue buscando
   - Adicione TODAS as ocorrências relevantes

3. ADICIONE TODOS OS NÍVEIS INTERMEDIÁRIOS:
   - Se identificou "Insulinoterapia" (nível 4), adicione CADA nível:
     * Clínica Médica (filtro raiz)
     * Endocrinologia (subfiltro nível 2)
     * Diabetes (subfiltro nível 3)
     * Insulinoterapia (subfiltro nível 4)
   - CADA nível deve ser um item SEPARADO no array de subfilters

4. PROFUNDIDADE:
   - Explore até o nível MAIS PROFUNDO (3-6 níveis por caminho)
   - MANTENHA A MESMA PROFUNDIDADE EM TODAS AS QUESTÕES

5. VALIDAÇÃO:
   - Use o "questionId" EXATO mostrado no cabeçalho de cada questão
   - Priorize a RESPOSTA CORRETA (peso 80%)
   - Use TODO o contexto disponível (200K input, 128K output)
   - Haverá validação manual - se não fizer direito, terá que REFAZER TUDO

⚠️⚠️⚠️ ATENÇÃO FINAL - REGRAS OBRIGATÓRIAS ⚠️⚠️⚠️

1. VOCÊ DEVE CATEGORIZAR TODAS AS ${batch.length} QUESTÕES!
2. SE RETORNAR MENOS DE ${batch.length} CATEGORIZAÇÕES, O PROCESSO SERÁ CANCELADO!
3. NÃO PULE NENHUMA QUESTÃO!
4. RACIOCINE ANTES DE CATEGORIZAR - NÃO ADIVINHE!
5. NEM TODA QUESTÃO É MULTIDISCIPLINAR - PENSE SE REALMENTE É!
6. USE APENAS IDs QUE EXISTEM NA HIERARQUIA - NÃO INVENTE!
7. FILTERS = Apenas filtros raiz (ClinicaMedica, Cirurgia, Pediatria, etc.)
8. SUBFILTERS = Todos os subfiltros (ClinicaMedica_Pneumologia, etc.)
9. SE NÃO ENCONTRAR SUBFILTRO ESPECÍFICO, USE APENAS O FILTRO MAIS PRÓXIMO!
10. CATEGORIZE TODAS AS ${batch.length} QUESTÕES COMPLETAMENTE!`;

    // Collect images
    const images = batch
      .filter(q => q.imagem)
      .map(q => ({
        url: q.imagem!,
        type: 'medical_image',
      }));

    return {
      systemPrompt,
      userPrompt,
      images: images.length > 0 ? images : undefined,
      filterHierarchy,
      questionContext: {
        statement: batch[0]?.enunciado || '',
        alternatives: batch[0]?.alternativas || [],
        correctAnswer: batch[0]?.correta !== undefined ? String(batch[0].correta) : '',
        hasImage: batch.some(q => !!q.imagem),
      },
    };
  }


  /**
   * Validate depth of categorization and calculate metrics
   */
  private validateDepth(categorization: any): {
    valid: boolean;
    depth: number;
    avgDepth: number;
    minDepth: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const depths: number[] = [];

    // Calculate depth from subfilters
    for (const subfilter of categorization.subfilters) {
      const depth = subfilter.parentPath.length + 1; // +1 for the subfilter itself
      depths.push(depth);
    }

    // If no subfilters, check filters
    if (depths.length === 0 && categorization.filters.length > 0) {
      depths.push(1); // Filters are level 1
    }

    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    const minDepth = depths.length > 0 ? Math.min(...depths) : 0;
    const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;

    // Validate minimum depth
    if (maxDepth < 2) {
      warnings.push(`Profundidade insuficiente: ${maxDepth} (mínimo: 2)`);
    }

    // Check if deeper levels exist but weren't explored
    for (const subfilter of categorization.subfilters) {
      const node = this.filterHierarchyManager.getNodeById(subfilter.id);
      if (node && node.children.length > 0) {
        warnings.push(`Subfiltro "${subfilter.name}" possui ${node.children.length} filhos não explorados`);
      }
    }

    // console.log(`📏 Depth validation: max=${maxDepth}, avg=${avgDepth.toFixed(1)}, min=${minDepth}, warnings=${warnings.length}`);

    return {
      valid: maxDepth >= 2,
      depth: maxDepth,
      avgDepth,
      minDepth,
      warnings,
    };
  }

  private buildHierarchyChain(subfilters: CategorizationResult['suggestedSubfilters']): CategorizationResult['hierarchyChain'] {
    if (subfilters.length === 0) {
      return [];
    }

    // Get the most specific subfilter (highest confidence)
    const mostSpecific = subfilters.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );

    // Get full path from hierarchy manager
    const fullPath = this.filterHierarchyManager.getFullPath(mostSpecific.subfilterId);

    return fullPath.map(node => ({
      id: node.id,
      name: node.name,
      level: node.level,
    }));
  }

  async validateCategorization(result: CategorizationResult): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate filter IDs exist
    for (const filter of result.suggestedFilters) {
      const node = this.filterHierarchyManager.getNodeById(filter.filterId);
      if (!node) {
        errors.push(`Filter ID not found: ${filter.filterId}`);
      }
    }

    // Validate subfilter IDs exist
    for (const subfilter of result.suggestedSubfilters) {
      const node = this.filterHierarchyManager.getNodeById(subfilter.subfilterId);
      if (!node) {
        errors.push(`Subfilter ID not found: ${subfilter.subfilterId}`);
      }
    }

    // Validate hierarchy chain
    if (result.hierarchyChain.length > 0) {
      for (let i = 1; i < result.hierarchyChain.length; i++) {
        const child = this.filterHierarchyManager.getNodeById(result.hierarchyChain[i].id);
        const parent = this.filterHierarchyManager.getNodeById(result.hierarchyChain[i - 1].id);

        if (child && parent && child.parentId !== parent.id) {
          errors.push(`Invalid hierarchy chain: ${child.name} is not a child of ${parent.name}`);
        }
      }
    }

    // Warnings for low confidence
    if (result.overallConfidence < 60) {
      warnings.push(`Low confidence categorization: ${result.overallConfidence}%`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async applyCategorization(
    questionId: string,
    categorization: CategorizationResult
  ): Promise<void> {
    // Validate first
    const validation = await this.validateCategorization(categorization);
    if (!validation.valid) {
      throw new Error(`Invalid categorization: ${validation.errors.join(', ')}`);
    }

    // Extract filter and subfilter IDs
    const filterIds = categorization.suggestedFilters.map(f => f.filterId);
    const subFilterIds = categorization.suggestedSubfilters.map(sf => sf.subfilterId);

    // Update question in database
    const { error } = await this.supabase
      .from('questions')
      .update({
        filter_ids: filterIds,
        sub_filter_ids: subFilterIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId);

    if (error) {
      throw new Error(`Failed to apply categorization: ${error.message}`);
    }
  }

  async logFeedback(
    questionId: string,
    originalCategorization: CategorizationResult,
    correctedCategorization: CategorizationResult,
    userId: string,
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('categorization_feedback')
      .insert({
        question_id: questionId,
        user_id: userId,
        original_categorization: originalCategorization,
        corrected_categorization: correctedCategorization,
        reason,
        ai_model: 'meta-llama/llama-4-maverick:free',
        ai_confidence: originalCategorization.overallConfidence,
      });

    if (error) {
      console.error('Failed to log feedback:', error);
      throw new Error(`Failed to log feedback: ${error.message}`);
    }
  }
}

// Factory function
export function createCategorizationService(
  supabaseUrl: string,
  supabaseKey: string,
  aiClient: OpenRouterClient,
  filterHierarchyManager: FilterHierarchyManager
): CategorizationService {
  return new CategorizationService(supabaseUrl, supabaseKey, aiClient, filterHierarchyManager);
}
