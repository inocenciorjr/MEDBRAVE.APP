import axios, { AxiosInstance } from 'axios';

export interface MinimaxConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeout: number;
  maxTokens?: number;
}

export class MinimaxClient {
  private client: AxiosInstance;
  private config: MinimaxConfig;

  constructor(config: MinimaxConfig) {
    this.config = {
      ...config,
      maxTokens: config.maxTokens ?? 128000, // MiniMax M2 supports 128K output tokens
    };

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      maxContentLength: Infinity, // Remove limit on response size
      maxBodyLength: Infinity, // Remove limit on request size
    });
  }

  async categorize(prompt: any, batchSize: number = 1): Promise<any> {
    try {
      // MiniMax M2: 200K input + 128K output tokens
      // Using Anthropic-compatible API with Interleaved Thinking
      const maxTokens = this.config.maxTokens || 128000;
      console.log(`🎯 MiniMax M2: Using max_tokens: ${maxTokens} (batch size: ${batchSize}, 200K input + 128K output)`);

      if (prompt.images && prompt.images.length > 0) {
        console.warn(`⚠️ MiniMax M2: Images not supported, processing text only`);
      }

      // Build messages array (Anthropic format)
      // System prompt goes in system parameter, not in messages
      const messages = [
        {
          role: 'user',
          content: prompt.userPrompt,
        },
      ];

      // Log prompt sizes to detect truncation
      const systemPromptLength = prompt.systemPrompt.length;
      const userPromptLength = prompt.userPrompt.length;
      const totalPromptLength = systemPromptLength + userPromptLength;
      console.log(`📏 Prompt sizes: system=${systemPromptLength} chars, user=${userPromptLength} chars, total=${totalPromptLength} chars`);

      // Check if prompt seems complete (should end with expected text)
      const userPromptEnd = prompt.userPrompt.slice(-100);
      console.log(`📝 User prompt ends with: "${userPromptEnd}"`);

      // MiniMax M2 Anthropic-compatible API
      const response = await this.client.post('/v1/messages', {
        model: this.config.model,
        system: prompt.systemPrompt, // System prompt separate from messages
        messages,
        max_tokens: maxTokens,
        temperature: 0.7, // Balanced for reasoning tasks
        top_p: 0.9,
        // No need for reasoning_split - Anthropic API handles thinking natively
      });

      // Extract thinking and text content from Anthropic response format
      const thinkingBlock = response.data.content?.find((item: any) => item.type === 'thinking');
      const textBlock = response.data.content?.find((item: any) => item.type === 'text');

      const thinking = thinkingBlock?.thinking || '';
      const content = textBlock?.text || '';

      if (!content) {
        console.error('❌ MiniMax M2 returned empty content. Full response:', JSON.stringify(response.data, null, 2));
        throw new Error('MiniMax M2 returned empty content');
      }

      // Log do conteúdo RAW para debug
      console.log(`📄 MiniMax M2 raw content (first 1000 chars):`, content.substring(0, 1000));
      console.log(`📄 Content length: ${content.length} chars`);
      console.log(`📄 First char code:`, content.charCodeAt(0), `(${content[0]})`);
      console.log(`📄 Last char code:`, content.charCodeAt(content.length - 1), `(${content[content.length - 1]})`);

      // Token usage details
      const usage = response.data.usage || {};
      const inputTokens = usage.input_tokens || 0;
      const outputTokens = usage.output_tokens || 0;
      const totalTokens = inputTokens + outputTokens;
      const outputPercentage = ((outputTokens / maxTokens) * 100).toFixed(1);

      console.log('📊 Token usage:');
      console.log(`   📥 Input: ${inputTokens} tokens`);
      console.log(`   � Output : ${outputTokens} / ${maxTokens} (${outputPercentage}% used)`);
      console.log(`   � Tontal: ${totalTokens} tokens`);

      // Check if response was truncated
      if (response.data.stop_reason === 'max_tokens') {
        console.error('❌❌❌ MiniMax M2 response was TRUNCATED due to max tokens limit!');
        console.error('❌ This will cause JSON parse errors!');
        console.error('❌ Batch size: ${batchSize}, Max tokens: ${maxTokens}');
        console.error('❌ Solution: Reduce batch size or increase max_tokens');
        throw new Error(`Response truncated at max_tokens (${maxTokens}). Reduce batch size from ${batchSize} to ${Math.floor(batchSize / 2)}`);
      }

      // ✅ Tentar parsear resposta - se falhar, lançar erro para acionar retry
      let categorizations;
      try {
        categorizations = this.parseResponse(content);
        console.log('📊 Parsed categorizations:', categorizations.length, 'items');
      } catch (parseError) {
        console.error('❌ ERRO DE PARSING - JSON malformado ou truncado!');
        console.error('❌ Isso vai acionar o sistema de RETRY');
        // Re-lançar erro para acionar retry no serviço que chamou
        throw parseError;
      }

      // ✅ VALIDAÇÃO CRÍTICA: Verificar se retornou o número esperado de items
      if (categorizations.length === 0 && batchSize > 0) {
        console.error(`❌ ERRO CRÍTICO: Esperava ${batchSize} items mas recebeu 0!`);
        console.error(`📄 Raw content:`, content.substring(0, 1000));
        throw new Error(`IA retornou array vazio quando esperava ${batchSize} items. Provavelmente JSON malformado.`);
      }

      // ⚠️ ALERTA: Se retornou apenas 1 item quando esperava mais
      if (categorizations.length === 1 && batchSize > 1) {
        console.warn(`⚠️⚠️⚠️ PROBLEMA DETECTADO: Esperava ${batchSize} items mas recebeu apenas 1!`);
        console.warn(`📋 Item recebido:`, JSON.stringify(categorizations[0], null, 2));
        console.warn(`📄 Raw content que gerou isso:`, content.substring(0, 2000));
      }

      return {
        success: true,
        categorizations,
        metadata: {
          model: this.config.model,
          tokensUsed: totalTokens,
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          maxTokens,
          outputUsagePercentage: parseFloat(outputPercentage),
          processingTime: 0,
          thinking: thinking.substring(0, 500), // Include thinking preview in metadata
        },
      };
    } catch (error: any) {
      console.error('MiniMax M2 API error:', error.response?.data || error.message);
      throw new Error(`MiniMax M2 API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private parseResponse(content: string): any[] {
    try {
      // MiniMax M2 with Anthropic API returns clean JSON without <think> tags
      // (thinking is in separate content block)
      let cleanContent = content.trim();

      // Try to extract JSON from markdown code blocks
      const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        // Remover quebras de linha literais que a IA às vezes adiciona
        let jsonContent = jsonMatch[1].trim();

        // Se começa com \n[ significa que tem quebras literais escapadas
        if (jsonContent.startsWith('\\n')) {
          console.warn('⚠️ Detectado JSON com quebras de linha escapadas, limpando...');
          jsonContent = jsonContent.replace(/\\n/g, '').replace(/\s+/g, ' ');
        }

        // 🔧 CORREÇÃO CRÍTICA: Remover escapes inválidos de entidades HTML
        // A IA às vezes gera \&quot; ao invés de &quot; ou \"
        // JSON não aceita \& como escape válido
        const beforeClean = jsonContent.substring(0, 200);
        jsonContent = jsonContent.replace(/\\&quot;/g, '&quot;');
        jsonContent = jsonContent.replace(/\\&lt;/g, '&lt;');
        jsonContent = jsonContent.replace(/\\&gt;/g, '&gt;');
        jsonContent = jsonContent.replace(/\\&amp;/g, '&amp;');

        if (beforeClean !== jsonContent.substring(0, 200)) {
          console.log('🔧 Limpeza de escapes inválidos aplicada!');
          console.log('   Antes:', beforeClean.substring(0, 100));
          console.log('   Depois:', jsonContent.substring(0, 100));
        }

        const parsed = JSON.parse(jsonContent);

        // Check if it's a wrapper object with rewrittenComments or categorizations
        if (parsed.rewrittenComments && Array.isArray(parsed.rewrittenComments)) {
          console.log(`✅ Successfully parsed ${parsed.rewrittenComments.length} rewritten comments from MiniMax M2 (from json block wrapper)`);
          return parsed.rewrittenComments.map((item: any) => ({
            questionId: item.questionId,
            rewrittenComment: item.rewrittenComment,
          }));
        }

        if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
          console.log(`✅ Successfully parsed ${parsed.categorizations.length} categorizations from MiniMax M2 (from json block wrapper)`);
          return parsed.categorizations;
        }

        const result = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Successfully parsed ${result.length} categorizations from MiniMax M2 (from json block)`);
        return result;
      }

      // Try code block without json tag
      const codeMatch = cleanContent.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        // Remover quebras de linha literais que a IA às vezes adiciona
        let jsonContent = codeMatch[1].trim();

        // Se começa com \n[ significa que tem quebras literais escapadas
        if (jsonContent.startsWith('\\n')) {
          console.warn('⚠️ Detectado JSON com quebras de linha escapadas, limpando...');
          jsonContent = jsonContent.replace(/\\n/g, '').replace(/\s+/g, ' ');
        }

        // 🔧 CORREÇÃO CRÍTICA: Remover escapes inválidos de entidades HTML
        const beforeClean2 = jsonContent.substring(0, 200);
        jsonContent = jsonContent.replace(/\\&quot;/g, '&quot;');
        jsonContent = jsonContent.replace(/\\&lt;/g, '&lt;');
        jsonContent = jsonContent.replace(/\\&gt;/g, '&gt;');
        jsonContent = jsonContent.replace(/\\&amp;/g, '&amp;');

        if (beforeClean2 !== jsonContent.substring(0, 200)) {
          console.log('🔧 Limpeza de escapes inválidos aplicada (code block)!');
        }

        const parsed = JSON.parse(jsonContent);

        // Check if it's a wrapper object with rewrittenComments or categorizations
        if (parsed.rewrittenComments && Array.isArray(parsed.rewrittenComments)) {
          console.log(`✅ Successfully parsed ${parsed.rewrittenComments.length} rewritten comments from MiniMax M2 (from code block wrapper)`);
          return parsed.rewrittenComments.map((item: any) => ({
            questionId: item.questionId,
            rewrittenComment: item.rewrittenComment,
          }));
        }

        if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
          console.log(`✅ Successfully parsed ${parsed.categorizations.length} categorizations from MiniMax M2 (from code block wrapper)`);
          return parsed.categorizations;
        }

        const result = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Successfully parsed ${result.length} categorizations from MiniMax M2 (from code block)`);
        return result;
      }

      // Try to find JSON array anywhere in the response (even without code blocks)
      // This handles cases where AI returns text + JSON without proper formatting
      const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          if (Array.isArray(parsed)) {
            console.log(`✅ Successfully parsed ${parsed.length} categorizations from MiniMax M2 (from inline array)`);
            return parsed;
          }
        } catch (e) {
          // Continue to next parsing attempt
        }
      }

      // Try to parse as direct JSON array
      if (cleanContent.startsWith('[')) {
        const parsed = JSON.parse(cleanContent);
        console.log(`✅ Successfully parsed ${parsed.length} categorizations from MiniMax M2 (direct array)`);
        return parsed;
      }

      // Try to parse as single JSON object
      if (cleanContent.startsWith('{')) {
        try {
          // 🔧 CORREÇÃO CRÍTICA: Sanitizar JSON antes de parsear
          let jsonContent = cleanContent;

          // Remover escapes inválidos de entidades HTML
          jsonContent = jsonContent.replace(/\\&quot;/g, '&quot;');
          jsonContent = jsonContent.replace(/\\&lt;/g, '&lt;');
          jsonContent = jsonContent.replace(/\\&gt;/g, '&gt;');
          jsonContent = jsonContent.replace(/\\&amp;/g, '&amp;');

          // Remover quebras de linha de formatação (fora das strings)
          // Isso remove \n, \r, \t que são usados para formatar o JSON
          jsonContent = jsonContent.replace(/\n/g, '').replace(/\r/g, '').replace(/\t/g, '');

          // Remover caracteres de controle inválidos
          jsonContent = jsonContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

          const parsed = JSON.parse(jsonContent);

          // Check if it's a wrapper object with categorizations or rewrittenComments array
          if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
            console.log(`✅ Successfully parsed ${parsed.categorizations.length} categorizations from MiniMax M2 (from wrapper object)`);
            return parsed.categorizations;
          }

          if (parsed.rewrittenComments && Array.isArray(parsed.rewrittenComments)) {
            console.log(`✅ Successfully parsed ${parsed.rewrittenComments.length} rewritten comments from MiniMax M2 (from wrapper object)`);
            // Convert to categorization format with rewrittenComment field
            return parsed.rewrittenComments.map((item: any) => ({
              questionId: item.questionId,
              rewrittenComment: item.rewrittenComment,
            }));
          }

          // Single object without array wrapper
          console.log(`✅ Successfully parsed 1 categorization from MiniMax M2 (direct object)`);
          return [parsed];
        } catch (parseError) {
          console.error('❌ Failed to parse direct JSON object:', parseError);
          console.error('📄 Content starts with:', cleanContent.substring(0, 100));
          console.error('📄 Content ends with:', cleanContent.substring(cleanContent.length - 100));

          // Tentar limpar e parsear novamente
          try {
            // Remover possíveis caracteres invisíveis no início
            const trimmedContent = cleanContent.replace(/^[^\{]*/, '').replace(/[^\}]*$/, '');
            const parsed = JSON.parse(trimmedContent);

            if (parsed.rewrittenComments && Array.isArray(parsed.rewrittenComments)) {
              console.log(`✅ Recuperado ${parsed.rewrittenComments.length} comentários após limpeza!`);
              return parsed.rewrittenComments.map((item: any) => ({
                questionId: item.questionId,
                rewrittenComment: item.rewrittenComment,
              }));
            }

            return [parsed];
          } catch (recoveryError) {
            console.error('❌ Falha na recuperação também');
            throw parseError; // Lançar erro original
          }
        }
      }

      console.warn('⚠️ Could not find JSON in MiniMax M2 response');
      console.warn('Response preview:', cleanContent.substring(0, 200));
      return [];
    } catch (error) {
      console.error('❌ Error parsing MiniMax M2 response:', error);
      console.error('Content that failed to parse (first 500 chars):', content.substring(0, 500));
      console.error('Content that failed to parse (last 500 chars):', content.substring(content.length - 500));

      // 🔍 DIAGNÓSTICO: Mostrar caracteres ao redor da posição do erro
      const errorMatch = (error as Error).message.match(/position (\d+)/);
      if (errorMatch) {
        const errorPos = parseInt(errorMatch[1]);
        const start = Math.max(0, errorPos - 50);
        const end = Math.min(content.length, errorPos + 50);
        const snippet = content.substring(start, end);

        console.error(`🔍 Caracteres ao redor da posição ${errorPos}:`);
        console.error(`   Texto: "${snippet}"`);
        console.error(`   Char codes:`, Array.from(snippet).map((c, i) => {
          const pos = start + i;
          const code = c.charCodeAt(0);
          const isError = pos === errorPos;
          return isError ? `[${code}:${c}]` : `${code}`;
        }).join(' '));

        if (errorPos < content.length) {
          const problemChar = content[errorPos];
          const problemCode = problemChar.charCodeAt(0);
          console.error(`❌ CARACTERE PROBLEMÁTICO na posição ${errorPos}:`);
          console.error(`   Char: "${problemChar}"`);
          console.error(`   Code: ${problemCode}`);
          console.error(`   Hex: 0x${problemCode.toString(16)}`);
        }
      }

      // Tentar recuperar JSON parcial
      if (content.includes('rewrittenComments') || content.includes('questionId')) {
        console.warn('🔧 Tentando recuperar JSON parcial...');

        // Tentar fechar JSON incompleto
        let fixedContent = content.trim();

        // Se termina com aspas abertas, fechar
        if (fixedContent.endsWith('"')) {
          fixedContent += '}]}';
        } else if (fixedContent.endsWith('}')) {
          fixedContent += ']}';
        } else if (fixedContent.endsWith(']')) {
          fixedContent += '}';
        } else {
          // Truncado no meio do texto, tentar fechar
          fixedContent += '"}]}';
        }

        try {
          const recovered = JSON.parse(fixedContent);
          if (recovered.rewrittenComments && Array.isArray(recovered.rewrittenComments)) {
            console.warn(`✅ Recuperado ${recovered.rewrittenComments.length} comentários de JSON parcial!`);
            return recovered.rewrittenComments;
          }
        } catch (recoveryError) {
          console.error('❌ Falha ao recuperar JSON parcial');
        }
      }

      console.error('⚠️ JSON provavelmente foi TRUNCADO ou tem caracteres inválidos!');
      return [];
    }
  }

  async analyzeImage(_imageUrl: string, _context: string): Promise<any> {
    console.warn('⚠️ MiniMax M2: Image analysis not supported');
    return {
      detected: false,
      imageType: 'Não suportado',
      relevance: 0,
      description: 'MiniMax M2 não suporta análise de imagens',
      medicalFindings: [],
    };
  }

  getUsageMetrics() {
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      successRate: 100,
      errorCount: 0,
    };
  }
}

export function createMinimaxClient(apiKey: string): MinimaxClient {
  const model = process.env.MINIMAX_MODEL || 'MiniMax-M2';
  const baseURL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/anthropic';
  const maxTokens = parseInt(process.env.MINIMAX_MAX_TOKENS || '128000', 10);

  // Silencioso - não loga para evitar poluição

  return new MinimaxClient({
    apiKey,
    model,
    baseURL,
    timeout: 310000, // 5 minutes 10 seconds for complex reasoning
    maxTokens,
  });
}
