import axios, { AxiosInstance, AxiosError } from 'axios';

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface CategorizationPrompt {
  systemPrompt: string;
  userPrompt: string;
  images?: Array<{
    url: string;
    type: string;
  }>;
  filterHierarchy: string;
  questionContext: {
    statement: string;
    alternatives: string[];
    correctAnswer: string;
    hasImage: boolean;
  };
}

export interface AICategorizationResponse {
  success: boolean;
  categorizations: Array<{
    questionId: string;
    filters: Array<{
      id: string;
      name: string;
      confidence: number;
      reasoning: string;
    }>;
    subfilters: Array<{
      id: string;
      name: string;
      parentPath: string[];
      confidence: number;
      reasoning: string;
    }>;
    hierarchyChain: Array<{
      id: string;
      name: string;
      level: number;
    }>;
    overallConfidence: number;
    explanation: string;
    imageInfluence?: number;
    answerKeyInfluence?: number;
  }>;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

export interface ImageAnalysisResult {
  imageType: string;
  relevance: number;
  description: string;
  medicalFindings: string[];
}

export interface UsageMetrics {
  totalRequests: number;
  totalTokens: number;
  averageResponseTime: number;
  successRate: number;
  errorCount: number;
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private config: OpenRouterConfig;
  private metrics: UsageMetrics;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://medbrave.app',
        'X-Title': 'MedBrave Question Categorization',
      },
    });

    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      successRate: 0,
      errorCount: 0,
    };
  }

  async categorize(prompt: CategorizationPrompt, batchSize: number = 1): Promise<AICategorizationResponse> {
    const startTime = Date.now();
    
    try {
      const messages = this.buildMessages(prompt);
      
      // Use maximum tokens available - explanations are kept short to avoid truncation
      const maxTokens = 8000; // OpenRouter typical maximum
      console.log(`🎯 Using max_tokens: ${maxTokens} (batch size: ${batchSize})`);
      
      const response = await this.makeRequest({
        model: this.config.model,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        top_p: 0.9,
      });

      const processingTime = Date.now() - startTime;
      
      // Update metrics
      this.updateMetrics(true, processingTime, response.usage?.total_tokens || 0);

      // Parse AI response
      const categorizations = this.parseCategorizationResponse(response.choices[0].message.content);

      return {
        success: true,
        categorizations,
        metadata: {
          model: this.config.model,
          tokensUsed: response.usage?.total_tokens || 0,
          processingTime,
        },
      };
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime, 0);
      throw this.handleError(error);
    }
  }

  async analyzeImage(imageUrl: string, context: string): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    const useLMStudio = process.env.USE_LM_STUDIO === 'true';

    try {
      // LM Studio: análise de imagem não suportada
      if (useLMStudio) {
        console.log('⚠️ LM Studio: Análise de imagem desabilitada (use apenas texto)');
        return {
          imageType: 'Não suportado (LM Studio)',
          relevance: 0,
          description: 'Análise de imagem não disponível com LM Studio',
          medicalFindings: [],
        };
      }

      const response = await this.makeRequest({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de imagens médicas. Analise imagens médicas e forneça descrições detalhadas em português brasileiro.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem médica no contexto de: ${context}\n\nForneça em português brasileiro:\n1. Tipo de imagem (ECG, Raio-X, TC, RM, ultrassom, etc.)\n2. Relevância para a questão (0-100%)\n3. Descrição breve\n4. Achados médicos principais\n\nResponda em formato JSON.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const processingTime = Date.now() - startTime;
      this.updateMetrics(true, processingTime, response.usage?.total_tokens || 0);

      return this.parseImageAnalysisResponse(response.choices[0].message.content);
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime, 0);
      throw this.handleError(error);
    }
  }

  private buildMessages(prompt: CategorizationPrompt): any[] {
    const useLMStudio = process.env.USE_LM_STUDIO === 'true';

    const messages: any[] = [
      {
        role: 'system',
        content: prompt.systemPrompt,
      },
    ];

    // LM Studio precisa de formato simples (apenas string)
    if (useLMStudio) {
      messages.push({
        role: 'user',
        content: prompt.userPrompt,
      });
    } else {
      // OpenRouter suporta formato complexo com imagens
      const userContent: any[] = [
        {
          type: 'text',
          text: prompt.userPrompt,
        },
      ];

      // Add images if present
      if (prompt.images && prompt.images.length > 0) {
        for (const image of prompt.images) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: image.url,
            },
          });
        }
      }

      messages.push({
        role: 'user',
        content: userContent,
      });
    }

    return messages;
  }

  private async makeRequest(payload: any, retryCount: number = 0): Promise<any> {
    try {
      const response = await this.client.post('/chat/completions', payload);
      return response.data;
    } catch (error) {
      if (this.isRateLimitError(error) && retryCount < this.config.retryConfig.maxRetries) {
        await this.handleRateLimit(retryCount);
        return this.makeRequest(payload, retryCount + 1);
      }
      throw error;
    }
  }

  private isRateLimitError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      return error.response?.status === 429;
    }
    return false;
  }

  private async handleRateLimit(retryCount: number): Promise<void> {
    const delay = this.config.retryConfig.initialDelay * 
                  Math.pow(this.config.retryConfig.backoffMultiplier, retryCount);
    
    console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.retryConfig.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        const status = axiosError.response.status;
        const data: any = axiosError.response.data;
        
        if (status === 429) {
          return new Error('Rate limit exceeded. Please try again later.');
        } else if (status === 401) {
          return new Error('Invalid API key.');
        } else if (status === 400) {
          return new Error(`Bad request: ${data.error?.message || 'Invalid request'}`);
        } else {
          return new Error(`API error (${status}): ${data.error?.message || 'Unknown error'}`);
        }
      } else if (axiosError.request) {
        return new Error('No response from API. Check your network connection.');
      }
    }
    
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }

  private parseCategorizationResponse(content: string): AICategorizationResponse['categorizations'] {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/```\n([\s\S]*?)\n```/) ||
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // Ensure it's an array
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      
      // Fallback: return empty array
      console.warn('Could not parse categorization response:', content);
      return [];
    } catch (error) {
      console.error('Error parsing categorization response:', error);
      return [];
    }
  }

  private parseImageAnalysisResponse(content: string): ImageAnalysisResult {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonStr);
      }
      
      // Fallback: parse from text
      return {
        imageType: 'Unknown',
        relevance: 50,
        description: content,
        medicalFindings: [],
      };
    } catch (error) {
      console.error('Error parsing image analysis response:', error);
      return {
        imageType: 'Unknown',
        relevance: 0,
        description: content,
        medicalFindings: [],
      };
    }
  }

  private updateMetrics(success: boolean, responseTime: number, tokens: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += tokens;
    
    if (!success) {
      this.metrics.errorCount++;
    }
    
    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
    this.metrics.averageResponseTime = totalTime / this.metrics.totalRequests;
    
    // Update success rate
    this.metrics.successRate = ((this.metrics.totalRequests - this.metrics.errorCount) / this.metrics.totalRequests) * 100;
  }

  getUsageMetrics(): UsageMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      averageResponseTime: 0,
      successRate: 0,
      errorCount: 0,
    };
  }
}

// Factory function to create client with default config
export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  // Check if using local LM Studio
  const useLMStudio = process.env.USE_LM_STUDIO === 'true';
  const lmStudioUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
  
  if (useLMStudio) {
    console.log('🏠 Using LM Studio (local) for AI categorization');
    return new OpenRouterClient({
      apiKey: 'not-needed', // LM Studio doesn't need API key
      model: process.env.LM_STUDIO_MODEL || 'local-model',
      baseURL: lmStudioUrl,
      timeout: 120000, // 2 minutes (local pode ser mais lento)
      retryConfig: {
        maxRetries: 2,
        backoffMultiplier: 1.5,
        initialDelay: 500,
      },
    });
  }
  
  // Default: OpenRouter
  console.log('☁️ Using OpenRouter (cloud) for AI categorization');
  return new OpenRouterClient({
    apiKey,
    model: 'meta-llama/llama-4-maverick:free',
    baseURL: 'https://openrouter.ai/api/v1',
    timeout: 60000, // 60 seconds
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000, // 1 second
    },
  });
}
