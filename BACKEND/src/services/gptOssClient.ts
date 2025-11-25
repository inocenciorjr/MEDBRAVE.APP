import axios, { AxiosInstance } from 'axios';

export interface GptOssConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeout: number;
}

export class GptOssClient {
  private client: AxiosInstance;
  private config: GptOssConfig;

  constructor(config: GptOssConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
  }

  async categorize(prompt: any, batchSize: number = 1): Promise<any> {
    try {
      const maxTokens = 128000; // GPT-OSS 128k output
      console.log(`🎯 GPT-OSS: Using max_tokens: ${maxTokens} (batch size: ${batchSize})`);
      
      // GPT-OSS usa Responses API (não Chat Completions!)
      // Responses API suporta reasoning effort
      const response = await this.client.post('/responses', {
        model: this.config.model,
        instructions: prompt.systemPrompt,
        input: prompt.userPrompt,
        temperature: 0.3,
        max_output_tokens: maxTokens,
        top_p: 0.9,
        // Reasoning effort: high para máxima profundidade
        reasoning: {
          effort: 'high',
        },
      });

      // Validar resposta da Responses API
      if (!response.data?.output || !Array.isArray(response.data.output)) {
        console.warn('⚠️ GPT-OSS: Invalid response structure', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response structure from GPT-OSS Responses API');
      }

      // Responses API retorna array de outputs
      // Procurar por output do tipo 'text'
      const textOutput = response.data.output.find((item: any) => item.type === 'text');
      
      if (!textOutput || !textOutput.content) {
        console.warn('⚠️ GPT-OSS: No text output found', JSON.stringify(response.data.output, null, 2));
        throw new Error('No text output in GPT-OSS response');
      }

      const content = textOutput.content;
      
      console.log('🤖 GPT-OSS raw response length:', content.length, 'chars');
      console.log('🤖 GPT-OSS raw response preview:', content.substring(0, 500) + '...');
      
      // Check if response was truncated
      if (response.data.stop_reason === 'max_tokens') {
        console.warn('⚠️ GPT-OSS response was truncated due to max tokens limit');
      }
      
      const categorizations = this.parseResponse(content);
      console.log('📊 Parsed categorizations:', categorizations.length, 'items');
      if (categorizations.length > 0) {
        console.log('📋 First categorization:', JSON.stringify(categorizations[0], null, 2));
      }

      return {
        success: true,
        categorizations,
        metadata: {
          model: this.config.model,
          tokensUsed: response.data.usage?.total_tokens || 0,
          processingTime: 0,
        },
      };
    } catch (error: any) {
      console.error('GPT-OSS API error:', error.response?.data || error.message);
      throw new Error(`GPT-OSS API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private parseResponse(content: string): any[] {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        return Array.isArray(parsed) ? parsed : [parsed];
      }

      // Try to parse as direct JSON array
      if (content.trim().startsWith('[')) {
        return JSON.parse(content.trim());
      }

      // Try to parse as single JSON object
      if (content.trim().startsWith('{')) {
        return [JSON.parse(content.trim())];
      }

      console.error('Failed to parse GPT-OSS response. Content:', content.substring(0, 500));
      throw new Error('Could not parse GPT-OSS response as JSON');
    } catch (error) {
      console.error('Error parsing GPT-OSS response:', error);
      throw new Error(`Failed to parse GPT-OSS response: ${error}`);
    }
  }

  async analyzeImage(_imageUrl: string, _context: string): Promise<any> {
    // GPT-OSS não suporta análise de imagem diretamente
    console.warn('⚠️ GPT-OSS does not support image analysis in this implementation');
    return {
      detected: false,
      imageType: 'Não suportado',
      relevance: 0,
      description: 'GPT-OSS não suporta análise de imagens nesta implementação',
      medicalFindings: [],
    };
  }
}

export function createGptOssClient(apiKey: string): GptOssClient {
  const model = process.env.GPT_OSS_MODEL || 'openai/gpt-oss-120b:fireworks-ai';
  const baseURL = process.env.GPT_OSS_BASE_URL || 'https://router.huggingface.co/v1';
  
  return new GptOssClient({
    apiKey,
    model,
    baseURL,
    timeout: 300000, // 5 minutes
  });
}
