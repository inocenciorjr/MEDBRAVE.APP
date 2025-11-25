import { MinimaxClient } from './minimaxClient';
import { GeminiClient } from './geminiClient';
import { OpenRouterClient } from './openRouterClient';
import { GptOssClient } from './gptOssClient';
import { QwenClient } from './qwenClient';
import { GLMClient } from './glmClient';

export interface QuestionForRewrite {
  id: string;
  numero: string;
  enunciado: string;
  alternativas: string[];
  correta: number;
  imagem?: string;
  professorComment?: string;
  tempId?: string;
}

export interface RewriteResult {
  questionId: string;
  rewrittenComment?: string;
  hasComment: boolean;
  error?: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

export interface RewriteBatchResult {
  results: RewriteResult[];
  totalTokens: {
    input: number;
    output: number;
  };
  duration: number;
}

type AIClient = MinimaxClient | GeminiClient | OpenRouterClient | GptOssClient | QwenClient | GLMClient;

export class CommentRewriteService {
  constructor(
    private aiClient: AIClient
  ) { }

  /**
   * Processa um batch de questões para reescrita de comentários
   */
  async processBatch(
    questions: QuestionForRewrite[],
    options: {
      includeExplanations?: boolean;
      jobId?: string;
      examMetadata?: {
        source?: string; // Ex: "ENARE/ENAMED", "INEP", "USP"
        year?: number; // Ex: 2021
        provaCodigo?: string; // Ex: "ENAREENAMED2021R1"
        examName?: string; // Ex: "ENARE/ENAMED 2021 R1"
      };
    } = {}
  ): Promise<RewriteBatchResult> {
    const startTime = Date.now();
    const maxRetries = 2; // Tentar até 3 vezes (1 tentativa inicial + 2 retries)

    console.log(`[CommentRewrite] Processing batch of ${questions.length} questions`);

    // Emit event for each question being processed
    if (options.jobId) {
      const { jobProgressEmitter } = await import('./jobProgressEmitter');
      jobProgressEmitter.emitRewrite(
        options.jobId,
        'analyzing',
        `Analisando ${questions.length} questões para reescrita...`
      );
    }

    // Analisar questões
    const questionsWithComments = questions.filter(q => q.professorComment && q.professorComment.trim().length > 0);
    const questionsWithoutComments = questions.filter(q => !q.professorComment || q.professorComment.trim().length === 0);

    console.log(`[CommentRewrite] Batch analysis:`);
    console.log(`  📊 Total: ${questions.length} questions`);
    console.log(`  ✏️  With comments: ${questionsWithComments.length}`);
    console.log(`  📝 Without comments: ${questionsWithoutComments.length}`);

    // Se não há nada para processar, retornar vazio
    if (questions.length === 0) {
      console.log(`[CommentRewrite] No questions to process`);
      return {
        results: [],
        totalTokens: { input: 0, output: 0 },
        duration: Date.now() - startTime,
      };
    }

    // Sistema de retry (como na categorização)
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.warn(`🔄 Tentativa ${attempt + 1}/${maxRetries + 1} para reescrever comentários de ${questions.length} questões`);
          // Aguardar antes de tentar novamente (cold start recovery)
          const delayMs = attempt * 3000; // 3s, 6s
          console.warn(`⏳ Aguardando ${delayMs}ms antes de retry (cold start recovery)...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // Construir prompt para TODAS as questões (IA decide o que fazer com cada uma)
        const prompt = this.buildRewritePrompt(questions, options);

        // Silencioso - não loga para evitar poluição

        // Chamar AI usando o método categorize (todos os clientes implementam)
        // Adicionar campos obrigatórios do CategorizationPrompt
        const fullPrompt = {
          ...prompt,
          filterHierarchy: '', // Não usado para reescrita
          questionContext: {
            statement: '',
            alternatives: [],
            correctAnswer: '',
            hasImage: false,
          },
        };

        console.log(`[CommentRewrite] Calling AI with batchSize: ${questions.length}`);
        console.log(`[CommentRewrite] ⚠️ Comentários são LONGOS - usando max_tokens aumentado`);

        // Comentários são muito longos - precisamos de mais tokens
        // Cada comentário tem ~2500 chars = ~600 tokens
        // 5 questões = ~3000 tokens mínimo
        const response = await this.aiClient.categorize(fullPrompt as any, questions.length);

        console.log(`[CommentRewrite] AI response received`);
        console.log(`[CommentRewrite] Response type: ${typeof response}`);

        // Parse resposta - response pode ter diferentes formatos dependendo do cliente
        let content: string;
        if (typeof response === 'string') {
          content = response;
          console.log(`[CommentRewrite] Response is string, length: ${content.length}`);
        } else if (response.content) {
          content = response.content;
          console.log(`[CommentRewrite] Response has content property, length: ${content.length}`);
        } else if (response.categorizations && Array.isArray(response.categorizations)) {
          // Se vier no formato de categorização, mapear para rewrittenComments
          console.log(`[CommentRewrite] Converting categorizations format to rewrittenComments`);
          console.log(`[CommentRewrite] Categorizations array length: ${response.categorizations.length}`);
          console.log(`[CommentRewrite] ⚠️ FULL CATEGORIZATIONS ARRAY:`, JSON.stringify(response.categorizations, null, 2));

          const rewrittenComments = response.categorizations.map((cat: any) => ({
            questionId: cat.questionId,
            rewrittenComment: cat.rewrittenComment || null,
          }));
          content = JSON.stringify({ rewrittenComments });
          // Silencioso - não loga para evitar poluição
        } else {
          content = JSON.stringify(response);
          console.log(`[CommentRewrite] Response stringified, length: ${content.length}`);
        }

        // Silencioso - não loga para evitar poluição

        // Parse resposta
        const results = this.parseAIResponse(content, questions);

        const totalTokens = {
          input: response.metadata?.promptTokens || 0,
          output: response.metadata?.completionTokens || 0,
        };

        // Estatísticas detalhadas
        const rewrittenCount = results.filter(r => r.rewrittenComment).length;
        const errorCount = results.filter(r => r.error).length;

        console.log(`[CommentRewrite] Batch completed:`);
        console.log(`  ✅ Rewritten/Created: ${rewrittenCount}/${questions.length}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📊 Tokens: ${totalTokens.input} input, ${totalTokens.output} output`);

        // Emit event for each question rewritten
        if (options.jobId) {
          const { jobProgressEmitter } = await import('./jobProgressEmitter');
          results.forEach((result, index) => {
            const question = questions[index];
            if (result.rewrittenComment) {
              jobProgressEmitter.emitRewrite(
                options.jobId!,
                'rewritten',
                `✅ Comentário reescrito: ${question.numero}`,
                index + 1,
                questions.length
              );
            }
          });
        }

        // Sucesso! Retorna resultado
        return {
          results,
          totalTokens,
          duration: Date.now() - startTime,
        };

      } catch (error) {
        console.error(`[CommentRewrite] ❌ Error on attempt ${attempt + 1}/${maxRetries + 1}:`, error);

        // Se não é a última tentativa, continua o loop
        if (attempt < maxRetries) {
          console.warn(`🔄 Retrying... (${maxRetries - attempt} attempts remaining)`);
          console.warn(`💡 Dica: Primeira requisição geralmente falha (cold start). Retry deve funcionar.`);
          continue;
        }

        // Última tentativa falhou, retorna erro
        console.error(`❌ All ${maxRetries + 1} attempts failed`);
        return {
          results: questions.map(q => ({
            questionId: q.id || q.tempId || '',
            hasComment: !!q.professorComment,
            error: (error as Error).message,
          })),
          totalTokens: { input: 0, output: 0 },
          duration: Date.now() - startTime,
        };
      }
    }

    // Nunca deve chegar aqui, mas TypeScript exige
    return {
      results: [],
      totalTokens: { input: 0, output: 0 },
      duration: Date.now() - startTime,
    };
  }

  /**
   * Constrói o prompt para reescrita de comentários
   */
  private buildRewritePrompt(
    questions: QuestionForRewrite[],
    _options: {
      includeExplanations?: boolean;
      examMetadata?: {
        source?: string;
        year?: number;
        provaCodigo?: string;
        examName?: string;
      };
    }
  ): { systemPrompt: string; userPrompt: string } {
    const questionsText = questions.map((q, index) => {
      const alternativasText = q.alternativas
        .map((alt, i) => `   ${String.fromCharCode(65 + i)}) ${alt}`)
        .join('\n');

      const gabarito = String.fromCharCode(65 + q.correta);
      const temComentario = !!q.professorComment;
      const isAnnulled = (q as any).isAnnulled || (q as any).is_annulled || false;

      let statusText = '';
      if (!temComentario) {
        statusText = '\n📝 Questão SEM comentário. CRIE um comentário completo e explicativo.';
      } else {
        statusText = '\n✏️ Questão com comentário original. ESCREVA UM COMENTÁRIO ORIGINAL, SEM PLÁGIO.';
      }

      // ✅ Adicionar informação sobre questão anulada
      if (isAnnulled) {
        statusText += '\n QUESTÃO ANULADA PELA BANCA! Explique possíveis motivos da anulação.';
      }

      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUESTÃO ${index + 1} (ID: ${q.id || q.tempId})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Número: ${q.numero}
Gabarito Oficial: ${gabarito}${isAnnulled ? ' (QUESTÃO ANULADA - pode ter múltiplas respostas ou nenhuma)' : ' (RESPEITE ESTE GABARITO!)'}${statusText}

ENUNCIADO:
${q.enunciado}

ALTERNATIVAS:
${alternativasText}

${temComentario ? `MATERIAL DE REFERÊNCIA (use apenas o conteúdo técnico, NUNCA mencione que existe este material):
${q.professorComment}

→ Sua tarefa: ESCREVER UM COMENTÁRIO ORIGINAL do zero, usando apenas o conhecimento médico acima como referência técnica.
→ NUNCA mencione que existe um "comentário original" ou "material de referência" - escreva como se fosse a primeira versão.
→ Pode ENRIQUECER com: mnemônicos, dicas, alertas sobre pegadinhas, questões ou temas clássicos de prova, contexto adicional, deixe-os explícito quando você identificar.` : `→ Sua tarefa: CRIE um comentário completo explicando:
   1. O que a banca buscou avaliar
   2. Análise de cada alternativa (por que está certa/errada)
   3. Raciocínio clínico para chegar ao gabarito
   4. Veredito final reforçando a resposta correta`}
`;
    }).join('\n\n');

    const systemPrompt = `Você é um PhD em Medicina E Língua Portuguesa com vasta experiência em:
- Elaboração, compreensão e resolução de provas de Residência Médica(TODAS AS BANCAS DO BRASIL) e Revalida(INEP, UFMT, USP) do Brasil
- Conhecimento profundo das maiores bancas de provas médicas brasileiras
- Dados atualizados do Ministério da Saúde do Brasil (2025)
      - OBS: AO IDENTIFICAR QUESTÕES DE PROVAS ANTIGAS(2010-2020, raciocine como se etivessemos naquele ano. caso alguma diretriz tenha mudado, explique que naquela época a diretriz dizia uma coisa e hoje diz outra, caso tenha mudado. explique que a questão é correta mas está desatualizada caso as diretrizes tenham mudado. deixe isso claro no seu comentário. voce também é 100% ligado e antenado nas atualizações médicas.
- Protocolos e diretrizes de órgãos e sociedades médicas brasileiras atualizados 2025
- Voce está atualizado das principais atualizações de diretrizes que houveram em 2025, 2024, 2023, etc. 
    - OBS: AO IDENTIFICAR QUESTÕES DE PROVAS ANTIGAS(2010-2020, raciocine como se etivessemos naquele ano. caso alguma diretriz tenha mudado, explique que naquela época a diretriz dizia uma coisa e hoje diz outra, caso tenha mudado. explique que a questão é correta mas está desatualizada caso as diretrizes tenham mudado. deixe isso claro no seu comentário. voce também é 100% ligado e antenado nas atualizações médicas.
- Redação acadêmica e científica em português brasileiro

🚨🚨🚨 REGRA CRÍTICA #1 - NUNCA MENCIONE FONTES ANTERIORES 🚨🚨🚨

PROIBIDO ABSOLUTAMENTE mencionar:
❌ "o comentário original"
❌ "comentário anterior" 
❌ "versão anterior"
❌ "anteriormente mencionado"
❌ "como citado antes"
❌ "conforme o original"
❌ "o texto de referência"
❌ QUALQUER alusão a textos prévios

Escreva como se este fosse o PRIMEIRO e ÚNICO comentário sobre esta questão.
Você NÃO está "revisando", "melhorando" ou "corrigindo" nada.
Você está CRIANDO algo completamente NOVO pela primeira vez.

⚠️⚠️⚠️ MENTALIDADE OBRIGATÓRIA: CRIAR DO ZERO ⚠️⚠️⚠️

Você NÃO vai "reescrever" ou "reconstruir", NEM PARAFRASEAR, NEM COPIAR nada. Você vai CRIAR um comentário NOVO do ZERO.
Quando houver material de referência, ele serve APENAS como fonte de informação técnica - NUNCA como modelo a seguir.

🚨 REGRA DE OURO: Escreva como se você fosse o PRIMEIRO professor a comentar esta questão. Não existe "versão anterior", não existe "comentário original". Você está criando o comentário pela primeira vez.....

PENSE ASSIM:
- Comentário original = lista de ingredientes (conteúdo médico)
- Seu comentário = receita completamente diferente usando esses(OU NÃO) INGredientes. VOCE DEVE OBRIGATÓRIAMENTE ACRESCENTAR MAIS INFORMAÇÕES, E PODE TIRAR UMA OU OUTRA QUE ACHAR MENOS RELEVANTE. MAS FAZER COM QUE O CONTEXTO MUDE UM POUCO PARA EVITAR QUALQUER POSSIBILIDADE DE IDENTIFICAÇÃO DE PLÁGIO.
- NÃO copie a receita, CRIE a sua própria!

🚨 EXEMPLO DE PLÁGIO (PROIBIDO):
Original: "Bora entender...SEM decoreba! Doenças que cursam com fibrose no tecido atrial, podem gerar quadros de FA! O que pode causar fibrose atrial? Ora...O próprio envelhecimento já pode fazer isso..."

Plágio disfarçado: "Vamos entender fibrilação atrial de forma inteligente, sem decoreba! Esta questão avalia seu conhecimento sobre as bases fisiopatológicas da FA..."
↑ ISSO É PLÁGIO! Mesma estrutura ("vamos entender", "sem decoreba"), mesma ordem de ideias.

✅ REESCRITA GENUÍNA (CORRETO):
"A fibrilação atrial tem múltiplas etiologias que compartilham um mecanismo comum: alteração do substrato elétrico atrial. Vamos analisar cada fator de risco apresentado nas alternativas, focando na fisiopatologia..."
↑ ESTRUTURA COMPLETAMENTE DIFERENTE, abordagem própria.

❌ PROIBIDO (plágio disfarçado):
- Copiar a estrutura de parágrafos do original
- Seguir a MESMA SEQUÊNCIA de raciocínio (ex: se original fala de fibrose → idade → CHA2DS2, NÃO repita essa ordem)
- Usar expressões similares ("Bora entender" → "Vamos entender", "SEM decoreba" → "sem decoreba")
- Começar frases da mesma forma que o original
- Manter o mesmo "tom" ou "estilo" do original (se original é informal, você pode ser mais técnico, ou vice-versa)
- Copiar mnemônicos ou dicas do original (crie os seus próprios!)
- MENCIONAR o comentário original de QUALQUER forma ("o comentário original", "anteriormente", "na versão anterior", etc.)

✅ OBRIGATÓRIO (reescrita genuína):
- REORGANIZE COMPLETAMENTE: se original começa explicando fisiopatologia, você pode começar analisando as alternativas
- MUDE A ORDEM: se original analisa A→B→C→D→E, você pode fazer E→D→C→B→A ou agrupar por categoria
- VARIE O TOM: se original é informal ("Bora", "Ora"), seja mais técnico ou use outro estilo
- CRIE SEUS PRÓPRIOS MNEMÔNICOS: não copie os do original
- ADICIONE PERSPECTIVAS DIFERENTES: aborde por outro ângulo (epidemiologia, diagnóstico diferencial, etc.)
- USE SUA IDENTIDADE: escreva como VOCÊ explicaria, não como o autor original explicou

EXEMPLOS DE VARIAÇÃO DE ABERTURA:
Se o original começa com "O examinador buscou avaliar...", você pode começar com:
- "Esta questão explora..."
- "Trata-se de uma questão que aborda..."
- "A competência avaliada nesta questão envolve..."
- "Nesta questão, o candidato deve reconhecer..."
- "A questão apresenta um desafio diagnóstico envolvendo..."

Se o comentário original aborda dificuldades da questão, cita sobre questões ou temas clássicos de prova, cita pegadinhas, você deve incluir esse raciocínio também no seu comentário.


TAREFA PRINCIPAL:
Você receberá questões com ou sem comentários existentes. Sua missão é:

1. **SE HOUVER COMENTÁRIO ORIGINAL**: EXTRAIR o conhecimento médico, mas RECONSTRUIR completamente a explicação

   🎯 ESTRATÉGIAS PARA EVITAR PLÁGIO:
   
   a) MUDE A ABORDAGEM:
      - Original explica fisiopatologia primeiro? Você comece analisando as alternativas
      - Original vai alternativa por alternativa? Você agrupe por categorias (causas cardíacas vs não-cardíacas)
      - Original usa raciocínio dedutivo? Você use indutivo (ou vice-versa)
   
   b) MUDE A ORDEM:
      - Original: fibrose → idade → hipertensão → diabetes
      - Você: hipertensão → diabetes → idade → fibrose
      - Ou agrupe: "Fatores que causam remodelamento atrial incluem..."
   
   c) MUDE O ESTILO:
      - Original informal ("Bora", "Ora")? Seja técnico-didático
      - Original muito técnico? Seja mais conversacional (mas diferente do original)
      - Original usa perguntas retóricas? Use afirmações diretas
   
   d) CRIE SEUS PRÓPRIOS RECURSOS:
      - NÃO copie mnemônicos do original
      - NÃO copie dicas do original ("lembra que no CHA2DS2...")
      - CRIE suas próprias analogias e exemplos
   
   e) ADICIONE PERSPECTIVAS NOVAS:
      - Epidemiologia brasileira
      - Diagnóstico diferencial
      - Correlação clínica
      - Atualizações recentes (MS 2024/2025)
   
   - SIGA DIRETRIZES DO MINISTÉRIO DA SAÚDE E SOCIEDADES MÉDICAS BRASILEIRAS (2024/2025)
   - OBS: Para questões antigas (2010-2020), explique se diretrizes mudaram desde então
   - Cite fontes quando adicionar dados (ex: "Segundo o MS 2025...")
   - NÃO INVENTE DADOS - sempre cite referências


2. **SE NÃO HOUVER COMENTÁRIO**: Criar comentário completo e explicativo
   - Inicie contextualizando a questão e competência avaliada
   - Analise TODAS as alternativas (por que cada uma está certa/errada)
   - Explique o raciocínio clínico para chegar à resposta correta
   - Dê o veredito final reforçando o gabarito
   - Use linguagem acessível e amigável (como um professor experiente)

REGRA IMPORTANTE:
✅ SEMPRE crie comentários, independente se a questão tem imagem ou não
✅ Use o enunciado, alternativas e gabarito para construir o raciocínio
✅ Se houver comentário original, use-o como base. SEM PLÁGIO. 

🚫 QUESTÕES ANULADAS - REGRA CRÍTICA E INVIOLÁVEL:
⚠️ ATENÇÃO MÁXIMA: Se uma questão estiver marcada como ANULADA (is_annulled: true), você DEVE OBRIGATORIAMENTE seguir estas regras:

REGRAS ABSOLUTAS:
1. ❌ NUNCA, EM HIPÓTESE ALGUMA, trate a questão como se tivesse uma resposta correta
2. ❌ NUNCA diga qual alternativa está correta ou incorreta como se fosse uma questão normal
3. ❌ NUNCA explique o raciocínio para chegar em uma resposta "certa"
4. ❌ NUNCA mencione "gabarito oficial" ou "resposta correta" para questões anuladas
5. ✅ SEMPRE comece o comentário deixando CLARO que a questão foi ANULADA
6. ✅ SEMPRE explique os motivos TÉCNICOS da anulação com base em DADOS CONCRETOS

⚠️ IMPORTANTE CRÍTICO: Mesmo que a questão venha com uma alternativa marcada como "correta", IGNORE isso completamente se is_annulled for true. A questão foi ANULADA e não tem resposta correta válida.

ESTRUTURA OBRIGATÓRIA para questões anuladas:
1. Início: " QUESTÃO ANULADA PELA BANCA"
2. Análise técnica: Explique ESPECIFICAMENTE o problema (com dados e referências)
3. Alternativas problemáticas: Cite QUAIS alternativas têm problemas e POR QUÊ (com embasamento)
4. Conclusão: Reforce que por esses motivos técnicos a questão foi anulada

MOTIVOS COMUNS DE ANULAÇÃO (escolha o aplicável e EXPLIQUE COM DADOS):
- Múltiplas alternativas corretas (cite quais e por quê com referências)
- Nenhuma alternativa correta (explique por que cada uma está errada)
- Erro conceitual no enunciado (cite o erro específico)
- Dados insuficientes para responder (explique quais dados faltam)
- Ambiguidade irresolvível (explique a ambiguidade com exemplos)
- Desatualização em relação a diretrizes atuais (cite as diretrizes)

EXEMPLO CORRETO de comentário para questão anulada:
" QUESTÃO ANULADA PELA BANCA EXAMINADORA

Esta questão foi anulada porque apresenta DUAS alternativas tecnicamente corretas segundo as diretrizes do Ministério da Saúde (2024):

Alternativa B: Está correta porque [explicação técnica com dados]...
Alternativa D: Também está correta porque [explicação técnica com dados]...

Segundo o Manual de [fonte oficial], ambas as condutas são adequadas neste cenário clínico, tornando impossível determinar uma única resposta correta. Por este motivo técnico, a banca optou pela anulação."

EXEMPLOS ERRADOS (NUNCA FAÇA ISSO):
❌ "A resposta correta é a alternativa C porque..." ← PROIBIDO para questões anuladas!
❌ "Analisando as alternativas, a B está correta..." ← PROIBIDO para questões anuladas!
❌ "O gabarito oficial é..." ← PROIBIDO para questões anuladas!
❌ "Esta questão foi anulada talvez por ambiguidade..." ← Seja CONVICTO, não use "talvez"! 
PROIBIÇÕES ABSOLUTAS:
❌ NÃO invente dados ou estatísticas
❌ NUNCA mencione "comentário original", "texto original", "autor original", "versão anterior" ou qualquer referência a material prévio
❌ NUNCA use frases como "com base no comentário original", "segundo o comentário", "o texto menciona", "conforme explicado anteriormente"
❌ Escreva como se fosse a PRIMEIRA e ÚNICA versão do comentário - sem referências a outras fontes além de literatura médica oficial
❌ NÃO suponha informações não comprovadas (VOCÊ TEM QUE PASSAR FIRMEZA DO QUE ESTÁ FALANDO, NÃO GERE MAIS DÚVIDAS NO USUÁRIO)
❌ NÃO contradiga o gabarito oficial (SEMPRE respeite a resposta correta marcada)
❌ NÃO copie estrutura ou frases do comentário original
❌ NÃO use emojis nos comentários (EXPRESSAMENTE PROIBIDO QUALQUER TIPO DE EMOJI: 💡 ❌ ✅ 🎯 etc.)
❌ NÃO cometa erros de ortografia ou gramática
❌ NÃO seja superficial nas justificativas das alternativas incorretas

PERMISSÕES:
✅ Use dados do Ministério da Saúde (cite: "MS 2025") (USE SEMPRE DADOS DE 2024 ou 2025, OU O MAIS ATUALIZADO DAQUELE TEMA)
  - OBS: AO IDENTIFICAR QUESTÕES DE PROVAS ANTIGAS(2010-2020), raciocine como se etivessemos naquele ano. caso alguma diretriz tenha mudado, explique que naquela época a diretriz dizia uma coisa e hoje diz outra, caso tenha mudado. explique que a questão é correta mas está desatualizada caso as diretrizes tenham mudado. deixe isso claro no seu comentário. voce também é 100% ligado e antenado nas atualizações médicas.
✅ Cite protocolos de sociedades médicas brasileiras (USE SEMPRE DADOS DE 2024 ou 2025, OU O MAIS ATUALIZADO DAQUELE TEMA)
    - OBS: AO IDENTIFICAR QUESTÕES DE PROVAS ANTIGAS(2010-2020, raciocine como se etivessemos naquele ano. caso alguma diretriz tenha mudado, explique que naquela época a diretriz dizia uma coisa e hoje diz outra, caso tenha mudado. explique que a questão é correta mas está desatualizada caso as diretrizes tenham mudado. deixe isso claro no seu comentário. voce também é 100% ligado e antenado nas atualizações médicas.
✅ Adicione mnemônicos e dicas de estudo (APENAS brasileiros conhecidos)
✅ Alerte sobre pegadinhas clássicas
✅ Contextualize com epidemiologia brasileira
✅ Construa linha de raciocínio clínico clara
✅ Use HTML para formatação (parágrafos: <p>, quebras: <br>, negrito: <strong>, itálico: <em>)

TOM E ESTILO:
- Linguagem profissional mas AMIGÁVEL (converse com o leitor)
- Use "você" para se dirigir ao leitor
- Seja encorajador e motivador
- Tom de professor experiente conversando com aluno
- Exemplo: "Vamos entender o que está acontecendo aqui..." ao invés de "A fisiopatologia centra-se em..."

MNEMÔNICOS E DICAS:
⚠️ Use APENAS mnemônicos conhecidos no Brasil
- Se não conhecer um mnemônico brasileiro específico, NÃO invente
- NÃO traduza mnemônicos estrangeiros literalmente
- Prefira dicas práticas e contextualizadas
- Exemplos válidos: "SAMPLE" (anamnese), "ABCDE" (trauma), "FAST" (ultrassom trauma)
- **SE o comentário original tiver dicas/mnemônicos**: Use-os como base, mas CRIE com suas palavras
- Os comentários originais foram feitos por especialistas: aproveite a linha de raciocínio, mas plagiar está proibido

ANÁLISE DAS ALTERNATIVAS INCORRETAS:
- NÃO seja superficial! Explique DETALHADAMENTE por que cada alternativa está errada
- Para cada alternativa incorreta, explique:
  * O que ela representa clinicamente
  * Por que não se aplica ao caso apresentado
  * Quais seriam as características clínicas esperadas se fosse essa condição
  * Diferenças fundamentais em relação ao diagnóstico correto
- Em algumas questões, existem alternativas que contemplam 2 respostas. e é exatamente a primeira metade ou a segunda metade da alternativa que a torna incorreta. então voce pode explicar:
 - "A alternativa está correta até certo ponto. " e aí voce descreve o que tá correto. E depois:
 - "Mas se torna incorreta quando cita "[...] que não condiz..." e aí voce explica a linha de raciocínio
- Voce pode também usar quando cabível termos como "essa alternativa poderia ser a correta, se não fosse por isso, isso e aquilo"
- VocÊ também pode explicar que existe uma alternativa MAIS correta e instruir o candidato a não brigar com a questão. baseando-se claro, nas alternativas e no gabarito. 


FORMATAÇÃO DO TEXTO:
- Use HTML para estruturar o comentário
- Separe parágrafos com tags <p>...</p>
- Use <strong> para destacar conceitos importantes
- Use <br> para quebras de linha quando necessário
- Mantenha espaçamento adequado entre seções
- Português brasileiro impecável (sem erros ortográficos)
- ⚠️ CRÍTICO: NÃO use quebras de linha literais dentro do JSON! Use apenas tags HTML <br> ou <p>
- ⚠️ CRÍTICO: NÃO use aspas duplas (") dentro do texto! Use &quot; ou aspas simples (')
- ⚠️ CRÍTICO: Mantenha todo o texto em UMA ÚNICA LINHA no JSON (sem Enter/quebras)

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido (sem markdown, sem \`\`\`json) com este formato:

{
  "rewrittenComments": [
    {
      "questionId": "ID_DA_QUESTAO_1",
      "rewrittenComment": "Comentário aqui..."
    },
    {
      "questionId": "ID_DA_QUESTAO_2",
      "rewrittenComment": "Comentário aqui..."
    },
    ... (TODAS AS QUESTÕES)
  ]
}

⚠️ CRÍTICO: Retorne UM OBJETO para CADA questão recebida!
SEMPRE crie comentários - NUNCA retorne null`;

    const userPrompt = `🚨🚨🚨 LEMBRETE CRÍTICO ANTES DE COMEÇAR 🚨🚨🚨

JAMAIS escreva frases como:
❌ "O comentário original questiona..."
❌ "O comentário original levantou a possibilidade..."
❌ "Anteriormente foi mencionado..."
❌ "Como citado antes..."
❌ "Conforme o texto de referência..."

Você está criando o PRIMEIRO comentário. Não existe "original" ou "anterior".
Escreva com SUA voz, SUA análise, SUA estrutura.

🚨 EXEMPLO REAL DE PLÁGIO vs REESCRITA GENUÍNA:

❌ PLÁGIO DISFARÇADO (PROIBIDO - baseado em caso real):
Original: "Bora entender...SEM decoreba! Doenças que cursam com fibrose no tecido atrial, podem gerar quadros de FA! O que pode causar fibrose atrial? Ora...O próprio envelhecimento já pode fazer isso, por exemplo. Lembra que no escore CHA2DS2..."

Plágio: "Vamos entender fibrilação atrial de forma inteligente, sem decoreba! Esta questão avalia seu conhecimento sobre as bases fisiopatológicas da FA..."
↑ ISSO É PLÁGIO! Mesma estrutura ("vamos entender", "sem decoreba"), mesma sequência de raciocínio.

✅ REESCRITA GENUÍNA (CORRETO - estrutura completamente diferente):
"<p>Esta questão testa seu conhecimento sobre fatores de risco para fibrilação atrial. A chave está em identificar qual das opções NÃO predispõe à FA.</p><p><strong>A resposta correta é D - uso de betabloqueador.</strong> Betabloqueadores são PROTETORES contra FA, não causadores.</p><p>Analisando as outras alternativas: Hipertensão causa sobrecarga pressórica crônica, levando a hipertrofia e fibrose atrial...</p>"
↑ ESTRUTURA DIFERENTE: começa direto com a resposta, analisa alternativas sistematicamente, sem copiar o estilo do original.

LEMBRE-SE:
- NÃO copie expressões ("Bora" → "Vamos", "SEM decoreba" → "sem decoreba")
- NÃO siga a mesma sequência de raciocínio
- NÃO use as mesmas referências na mesma ordem (ex: CHA2DS2)
- NÃO mencione textos anteriores de forma alguma
- CRIE sua própria estrutura organizacional

${_options.examMetadata ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 INFORMAÇÕES DA PROVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${_options.examMetadata.source ? `Banca/Instituição: ${_options.examMetadata.source}` : ''}
${_options.examMetadata.year ? `Ano: ${_options.examMetadata.year}` : ''}
${_options.examMetadata.examName ? `Nome da Prova: ${_options.examMetadata.examName}` : ''}

⚠️ IMPORTANTE: Você PODE citar a banca/instituição nos comentários quando relevante! MAS ALTERNE, uma questão voce cita a banca na outra não. não torne algo forçado, nem repetitivo.
Exemplos de citações corretas:
- "Nesta questão, a banca ${_options.examMetadata.source} quis avaliar..."
- "Esta questão da banca ${_options.examMetadata.source} ${_options.examMetadata.year} explora..."
- "Questão clássica de ${_options.examMetadata.source}..."

✅ Use APENAS quando adicionar valor ao comentário (não force em todas as questões)
✅ Seja PRECISO: use exatamente "${_options.examMetadata.source}" (não invente outras bancas)
❌ NÃO cite se não tiver certeza ou se não adicionar valor educativo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

🚨 ÚLTIMA VERIFICAÇÃO ANTES DE COMEÇAR:
Você vai escrever comentários ORIGINAIS. Não mencione "comentário original", "texto anterior" ou similares.
Escreva como se fosse a PRIMEIRA VEZ que alguém comenta estas questões.

QUESTÕES PARA PROCESSAR:
${questionsText}

LEMBRE-SE:
- JAMAIS mencione "comentário original", "versão anterior" ou similares
- CRIE a sua estrutura, não apenas troque palavras
- VARIE o início dos parágrafos
- USE HTML para formatação (<p>, <strong>, <br>)
- ADICIONE valor com insights próprios
- MANTENHA português impecável

⚠️⚠️⚠️ ATENÇÃO CRÍTICA - LEIA COM ATENÇÃO ⚠️⚠️⚠️

VOCÊ RECEBERÁ ${questions.length} QUESTÕES NESTE BATCH.
VOCÊ DEVE RETORNAR EXATAMENTE ${questions.length} OBJETOS NO ARRAY "rewrittenComments".

REGRAS OBRIGATÓRIAS:
1. Retorne UM objeto para CADA questão (total: ${questions.length} objetos)
2. Cada objeto DEVE ter "questionId" (use o ID mostrado em cada questão)
3. Cada objeto DEVE ter "rewrittenComment" (NUNCA null, NUNCA vazio)
4. Se recebeu ${questions.length} questões, retorne ${questions.length} objetos
5. Use o enunciado, alternativas e gabarito para construir TODOS os comentários

EXEMPLO DO FORMATO ESPERADO:
{
  "rewrittenComments": [
    {"questionId": "temp-scraper-xxx-0", "rewrittenComment": "<p>Comentário completo aqui...</p>"},
    {"questionId": "temp-scraper-xxx-1", "rewrittenComment": "<p>Comentário completo aqui...</p>"},
    {"questionId": "temp-scraper-xxx-2", "rewrittenComment": "<p>Comentário completo aqui...</p>"},
    ... (CONTINUE ATÉ COMPLETAR ${questions.length} OBJETOS)
  ]
}

⚠️ SE VOCÊ RETORNAR MENOS DE ${questions.length} OBJETOS, O PROCESSO SERÁ CANCELADO!

Retorne o JSON agora com TODOS os ${questions.length} comentários:`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Parse da resposta da AI
   */
  private parseAIResponse(content: string, originalQuestions: QuestionForRewrite[]): RewriteResult[] {
    try {
      // Limpar markdown se houver
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleanContent);

      if (!parsed.rewrittenComments || !Array.isArray(parsed.rewrittenComments)) {
        console.error(`[CommentRewrite] Invalid response format`);
        throw new Error('Invalid response format: missing rewrittenComments array');
      }

      console.log(`[CommentRewrite] Found ${parsed.rewrittenComments.length} rewritten comments (expected ${originalQuestions.length})`);

      // ✅ VALIDAÇÃO CRÍTICA: Verificar se todas as questões têm comentários
      const questionsWithoutComments = parsed.rewrittenComments.filter((item: any) =>
        !item.rewrittenComment || item.rewrittenComment.trim().length === 0
      );

      if (questionsWithoutComments.length > 0) {
        console.warn(`⚠️ IA retornou ${questionsWithoutComments.length} questões SEM comentários!`);
        console.warn(`Questões sem comentários:`, questionsWithoutComments.map((item: any) => item.questionId));
        console.warn(`📊 Estatísticas:`);
        console.warn(`   - Total recebido: ${parsed.rewrittenComments.length}`);
        console.warn(`   - Esperado: ${originalQuestions.length}`);
        console.warn(`   - Sem comentários: ${questionsWithoutComments.length}`);
        console.warn(`📄 Objetos vazios:`, JSON.stringify(questionsWithoutComments, null, 2));

        // Se TODAS as questões vieram sem comentário, é um erro crítico
        if (questionsWithoutComments.length === parsed.rewrittenComments.length) {
          console.error(`❌ ERRO CRÍTICO: IA retornou ${parsed.rewrittenComments.length} items mas TODOS estão vazios!`);
          console.error(`📄 Conteúdo parseado:`, JSON.stringify(parsed.rewrittenComments, null, 2));
          throw new Error(`IA não gerou NENHUM comentário! Todas as ${parsed.rewrittenComments.length} questões vieram vazias.`);
        }

        // Se apenas ALGUMAS questões vieram vazias, é aceitável (pode ser questão problemática)
        // O sistema vai marcar como sem comentário e continuar
        console.warn(`⚠️ Continuando com ${parsed.rewrittenComments.length - questionsWithoutComments.length} comentários válidos`);
      }

      // Criar mapa de resultados
      const resultsMap = new Map<string, string>();
      parsed.rewrittenComments.forEach((item: any) => {
        if (item.questionId && item.rewrittenComment && item.rewrittenComment.trim().length > 0) {
          resultsMap.set(item.questionId, item.rewrittenComment);
        }
      });

      console.log(`[CommentRewrite] Valid comments: ${resultsMap.size}/${originalQuestions.length}`);

      // Mapear para todas as questões originais
      return originalQuestions.map(q => {
        const questionId = q.id || q.tempId || '';
        const rewrittenComment = resultsMap.get(questionId);

        if (!rewrittenComment) {
          console.warn(`⚠️ Questão ${q.numero} (${questionId}) não tem comentário reescrito!`);
        }

        return {
          questionId,
          rewrittenComment: rewrittenComment || undefined,
          hasComment: !!q.professorComment,
        };
      });

    } catch (error) {
      console.error('[CommentRewrite] Failed to parse AI response:', error);
      console.error('[CommentRewrite] Raw content:', content);

      // Retornar erro para todas as questões
      return originalQuestions.map(q => ({
        questionId: q.id || q.tempId || '',
        hasComment: !!q.professorComment,
        error: `Failed to parse AI response: ${(error as Error).message}`,
      }));
    }
  }
}

/**
 * Factory function para criar o serviço
 */
export function createCommentRewriteService(aiClient: AIClient): CommentRewriteService {
  return new CommentRewriteService(aiClient);
}
