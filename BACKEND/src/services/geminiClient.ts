import axios, { AxiosInstance } from 'axios';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  baseURL: string;
  timeout: number;
}

export class GeminiClient {
  private client: AxiosInstance;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async categorize(prompt: any, batchSize: number = 1): Promise<any> {
    try {
      // Use maximum tokens available - explanations are kept short to avoid truncation
      const maxTokens = 8192; // Gemini 1.5 Flash maximum
      console.log(`🎯 Using max_tokens: ${maxTokens} (batch size: ${batchSize})`);
      
      // Build parts array with text and images
      const parts: any[] = [
        {
          text: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`,
        },
      ];

      // Add images if present
      if (prompt.images && prompt.images.length > 0) {
        console.log(`🖼️ Gemini: Processing ${prompt.images.length} images`);
        for (const image of prompt.images) {
          try {
            const imageData = await this.fetchImageAsBase64(image.url);
            
            // Detect MIME type from file extension
            let mimeType = 'image/jpeg'; // default
            const url = image.url.toLowerCase();
            if (url.endsWith('.png')) {
              mimeType = 'image/png';
            } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
              mimeType = 'image/jpeg';
            } else if (url.endsWith('.gif')) {
              mimeType = 'image/gif';
            } else if (url.endsWith('.webp')) {
              mimeType = 'image/webp';
            }
            
            parts.push({
              inlineData: {
                mimeType,
                data: imageData,
              },
            });
          } catch (error) {
            console.warn(`⚠️ Failed to load image ${image.url}, skipping:`, error);
            // Continue without this image
          }
        }
      }

      const response = await this.client.post(
        `/v1/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
            topP: 0.9,
          },
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      
      console.log('🤖 Gemini raw response length:', content.length, 'chars');
      console.log('🤖 Gemini raw response preview:', content.substring(0, 500) + '...');
      
      // Check if response was truncated
      if (response.data.candidates[0].finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ Gemini response was truncated due to max tokens limit');
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
          tokensUsed: response.data.usageMetadata?.totalTokenCount || 0,
          processingTime: 0,
        },
      };
    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      // Check if it's a local file path (Windows or Unix)
      if (url.startsWith('C:\\') || url.startsWith('/') || url.startsWith('./')) {
        // Read local file
        const fs = require('fs');
        const path = require('path');
        
        // Resolve absolute path
        const absolutePath = path.isAbsolute(url) ? url : path.resolve(process.cwd(), url);
        
        if (!fs.existsSync(absolutePath)) {
          console.warn(`⚠️ Image file not found: ${absolutePath}`);
          throw new Error('Image file not found');
        }
        
        const imageBuffer = fs.readFileSync(absolutePath);
        return imageBuffer.toString('base64');
      }
      
      // Fetch from URL
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
      console.error('Error fetching image:', error);
      throw new Error('Failed to fetch image for analysis');
    }
  }

  async analyzeImage(imageUrl: string, context: string): Promise<any> {
    try {
      const imageBase64 = await this.fetchImageAsBase64(imageUrl);
      
      // Detect MIME type from file extension
      let mimeType = 'image/jpeg'; // default
      const url = imageUrl.toLowerCase();
      if (url.endsWith('.png')) {
        mimeType = 'image/png';
      } else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      } else if (url.endsWith('.gif')) {
        mimeType = 'image/gif';
      } else if (url.endsWith('.webp')) {
        mimeType = 'image/webp';
      }

      const response = await this.client.post(
        `/v1/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `Analise esta imagem médica no contexto de: ${context}

Forneça em português brasileiro:
1. Tipo de imagem (ECG, Raio-X, TC, RM, ultrassom, etc.)
2. Relevância para a questão (0-100%)
3. Descrição breve
4. Achados médicos principais

Responda em formato JSON.`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }
      );

      // Validar resposta
      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.warn('⚠️ Gemini image analysis: Invalid response structure', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response structure from Gemini API');
      }

      const content = response.data.candidates[0].content.parts[0].text;
      const result = this.parseImageAnalysisResponse(content);
      
      console.log(`🖼️ Image analysis result: type=${result.imageType}, relevance=${result.relevance}%`);
      
      return result;
    } catch (error: any) {
      console.error('❌ Gemini image analysis error:', error);
      return {
        detected: false,
        imageType: `Erro na análise: ${error.message}`,
        relevance: 0,
        description: `Falha ao analisar imagem: ${error.message}`,
        medicalFindings: [],
      };
    }
  }

  private parseImageAnalysisResponse(content: string): any {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                       content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        return {
          detected: true,
          imageType: parsed.imageType || parsed.tipo || 'Desconhecido',
          relevance: parsed.relevance || parsed.relevancia || 50,
          description: parsed.description || parsed.descricao || content,
          medicalFindings: parsed.medicalFindings || parsed.achados || [],
        };
      }
      
      return {
        detected: true,
        imageType: 'Análise textual',
        relevance: 50,
        description: content,
        medicalFindings: [],
      };
    } catch (error) {
      return {
        detected: false,
        imageType: 'Erro no parsing',
        relevance: 0,
        description: content,
        medicalFindings: [],
      };
    }
  }

  private parseResponse(content: string): any[] {
    try {
      // Try multiple patterns to extract JSON
      let jsonStr = '';
      
      // Pattern 1: JSON in code block with json tag
      const jsonBlock = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlock) {
        jsonStr = jsonBlock[1];
      } else {
        // Pattern 2: JSON in code block without tag
        const codeBlock = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlock) {
          jsonStr = codeBlock[1];
        } else {
          // Pattern 3: Raw JSON array
          const rawJson = content.match(/\[[\s\S]*\]/);
          if (rawJson) {
            jsonStr = rawJson[0];
          }
        }
      }
      
      if (jsonStr) {
        const parsed = JSON.parse(jsonStr.trim());
        const result = Array.isArray(parsed) ? parsed : [parsed];
        console.log(`✅ Successfully parsed ${result.length} categorizations from Gemini`);
        return result;
      }
      
      console.warn('⚠️ Could not find JSON in Gemini response');
      console.warn('Response preview:', content.substring(0, 200));
      return [];
    } catch (error) {
      console.error('❌ Error parsing Gemini response:', error);
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

export function createGeminiClient(apiKey: string): GeminiClient {
  // Usar modelo do .env ou padrão
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  return new GeminiClient({
    apiKey,
    model,
    baseURL: 'https://generativelanguage.googleapis.com',
    timeout: 60000,
  });
}
