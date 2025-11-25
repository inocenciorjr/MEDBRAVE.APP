import axios, { AxiosInstance } from 'axios';

export interface GLMConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeout: number;
  maxContextLength?: number;
}

export class GLMClient {
  private client: AxiosInstance;
  private config: GLMConfig;

  constructor(config: GLMConfig) {
    this.config = {
      ...config,
      maxContextLength: config.maxContextLength ?? 32768, // Conservative default for output
    };

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
      // GLM-4.6 supports 200K tokens total context
      // Testing with Router API limits (similar to other models)
      const maxTokens = Math.min(32768, this.config.maxContextLength || 32768);
      console.log(`🎯 GLM-4.6: Using max_tokens: ${maxTokens} (batch size: ${batchSize}, 200K total context)`);

      // Build messages array (OpenAI-compatible format)
      const messages: any[] = [
        {
          role: 'system',
          content: prompt.systemPrompt,
        },
        {
          role: 'user',
          content: prompt.userPrompt,
        },
      ];

      // Note: GLM-4.6 via Router API is text-only
      if (prompt.images && prompt.images.length > 0) {
        console.log(`⚠️ GLM-4.6: Image support not available via Router API, processing text only`);
      }

      const response = await this.client.post('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      });

      const content = response.data.choices[0].message.content;

      // Token usage details
      const usage = response.data.usage || {};
      const promptTokens = usage.prompt_tokens || 0;
      const completionTokens = usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || 0;
      const outputPercentage = ((completionTokens / maxTokens) * 100).toFixed(1);

      console.log('🤖 GLM-4.6 raw response length:', content.length, 'chars');
      console.log('🤖 GLM-4.6 raw response preview:', content.substring(0, 500) + '...');
      console.log('📊 Token usage:');
      console.log(`   📥 Input tokens: ${promptTokens}`);
      console.log(`   📤 Output tokens: ${completionTokens} / ${maxTokens} (${outputPercentage}% used)`);
      console.log(`   🔢 Total tokens: ${totalTokens}`);

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
          tokensUsed: totalTokens,
          promptTokens,
          completionTokens,
          maxTokens,
          outputUsagePercentage: parseFloat(outputPercentage),
          processingTime: 0,
        },
      };
    } catch (error: any) {
      console.error('GLM-4.6 API error:', error.response?.data || error.message);
      throw new Error(`GLM-4.6 API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async analyzeImage(_imageUrl: string, _context: string): Promise<any> {
    console.warn('⚠️ GLM-4.6: Image analysis not supported via Router API');
    return {
      detected: false,
      imageType: 'Not supported',
      relevance: 0,
      description: 'GLM-4.6 via Router API does not support image analysis',
      medicalFindings: [],
    };
  }

  private parseResponse(content: string): any[] {
    try {
      // GLM-4.6 may wrap reasoning in <think></think> tags - remove them
      let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Try multiple patterns to extract JSON
      let jsonStr = '';

      // Pattern 1: JSON in code block with json tag
      const jsonBlock = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlock) {
        jsonStr = jsonBlock[1];
      } else {
        // Pattern 2: JSON in code block without tag
        const codeBlock = cleanContent.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlock) {
          jsonStr = codeBlock[1];
        } else {
          // Pattern 3: Raw JSON array
          const rawJsonArray = cleanContent.match(/\[[\s\S]*\]/);
          if (rawJsonArray) {
            jsonStr = rawJsonArray[0];
          } else {
            // Pattern 4: Raw JSON object (single item)
            const rawJsonObject = cleanContent.match(/\{[\s\S]*\}/);
            if (rawJsonObject) {
              jsonStr = rawJsonObject[0];
            }
          }
        }
      }

      if (jsonStr) {
        const parsed = JSON.parse(jsonStr.trim());
        const result = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Successfully parsed ${result.length} categorizations from GLM-4.6`);
        return result;
      }

      console.warn('⚠️ Could not find JSON in GLM-4.6 response');
      console.warn('Response preview:', cleanContent.substring(0, 200));
      return [];
    } catch (error) {
      console.error('❌ Error parsing GLM-4.6 response:', error);
      console.error('Content that failed to parse:', content.substring(0, 500));
      return [];
    }
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

export function createGLMClient(apiKey: string): GLMClient {
  // Usar modelo e configurações do .env
  const model = process.env.GLM_MODEL || 'zai-org/GLM-4.6';
  const baseURL = process.env.GLM_BASE_URL || 'https://router.huggingface.co/v1';
  const maxContextLength = parseInt(process.env.GLM_MAX_CONTEXT || '32768', 10);

  console.log(`🚀 Initializing GLM-4.6 client`);
  console.log(`   Model: ${model}`);
  console.log(`   Max output tokens: ${maxContextLength}`);
  console.log(`   Total context: 200K tokens (testing Router API limits)`);

  return new GLMClient({
    apiKey,
    model,
    baseURL,
    timeout: 120000, // 2 minutes - GLM-4.6 is faster than Qwen3-Thinking
    maxContextLength,
  });
}
