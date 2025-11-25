import axios, { AxiosInstance } from 'axios';

export interface QwenConfig {
    apiKey: string;
    model: string;
    baseURL: string;
    timeout: number;
    enableThinking?: boolean;
    maxContextLength?: number;
}

export class QwenClient {
    private client: AxiosInstance;
    private config: QwenConfig;

    constructor(config: QwenConfig) {
        this.config = {
            ...config,
            enableThinking: config.enableThinking ?? true, // Default: thinking mode for Thinking-2507
            maxContextLength: config.maxContextLength ?? 262144, // Native 256K context
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
            // Qwen3-235B-A22B-Thinking-2507: 235B params (22B active), 262K native context
            // Router API limits max_tokens to 32768
            const maxTokens = Math.min(32768, this.config.maxContextLength || 32768);
            console.log(`🎯 Qwen3-235B-Thinking: Using max_tokens: ${maxTokens} (batch size: ${batchSize}, Router API limit)`);

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

            // Note: Qwen3-235B-A22B-Thinking-2507 is text-only, no vision capabilities
            if (prompt.images && prompt.images.length > 0) {
                console.log(`⚠️ Qwen3-235B-Thinking: This model is text-only, processing text content only`);
            }

            // Sampling parameters based on Qwen3 best practices
            const samplingParams = this.config.enableThinking
                ? {
                    // Thinking mode: for complex reasoning
                    temperature: 0.6,
                    top_p: 0.95,
                }
                : {
                    // Non-thinking mode: for efficient dialogue
                    temperature: 0.7,
                    top_p: 0.8,
                };

            const response = await this.client.post('/chat/completions', {
                model: this.config.model,
                messages,
                max_tokens: maxTokens,
                ...samplingParams,
                stream: false,
            });

            const content = response.data.choices[0].message.content;

            // Token usage details
            const usage = response.data.usage || {};
            const promptTokens = usage.prompt_tokens || 0;
            const completionTokens = usage.completion_tokens || 0;
            const totalTokens = usage.total_tokens || 0;
            const outputPercentage = ((completionTokens / maxTokens) * 100).toFixed(1);

            console.log('🤖 Qwen3 raw response length:', content.length, 'chars');
            console.log('🤖 Qwen3 raw response preview:', content.substring(0, 500) + '...');
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
                    thinkingMode: this.config.enableThinking,
                },
            };
        } catch (error: any) {
            console.error('Qwen3 API error:', error.response?.data || error.message);
            throw new Error(`Qwen3 API error: ${error.response?.data?.error?.message || error.message}`);
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

            const response = await this.client.post('/chat/completions', {
                model: this.config.model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Analise esta imagem médica no contexto de: ${context}

Forneça em português brasileiro:
1. Tipo de imagem (ECG, Raio-X, TC, RM, ultrassom, etc.)
2. Relevância para a questão (0-100%)
3. Descrição breve
4. Achados médicos principais

Responda em formato JSON.`,
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${imageBase64}`,
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1000,
                temperature: 0.2,
            });

            // Validar resposta
            if (!response.data?.choices?.[0]?.message?.content) {
                console.warn('⚠️ Qwen3 image analysis: Invalid response structure', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response structure from Qwen3 API');
            }

            const content = response.data.choices[0].message.content;
            const result = this.parseImageAnalysisResponse(content);

            console.log(`🖼️ Image analysis result: type=${result.imageType}, relevance=${result.relevance}%`);

            return result;
        } catch (error: any) {
            console.error('❌ Qwen3 image analysis error:', error);
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
                    const rawJsonArray = content.match(/\[[\s\S]*\]/);
                    if (rawJsonArray) {
                        jsonStr = rawJsonArray[0];
                    } else {
                        // Pattern 4: Raw JSON object (single item)
                        const rawJsonObject = content.match(/\{[\s\S]*\}/);
                        if (rawJsonObject) {
                            jsonStr = rawJsonObject[0];
                        }
                    }
                }
            }

            if (jsonStr) {
                const parsed = JSON.parse(jsonStr.trim());
                const result = Array.isArray(parsed) ? parsed : [parsed];
                console.log(`✅ Successfully parsed ${result.length} categorizations from Qwen3`);
                return result;
            }

            console.warn('⚠️ Could not find JSON in Qwen3 response');
            console.warn('Response preview:', content.substring(0, 200));
            return [];
        } catch (error) {
            console.error('❌ Error parsing Qwen3 response:', error);
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

export function createQwenClient(apiKey: string): QwenClient {
    // Usar modelo e configurações do .env
    const model = process.env.QWEN_MODEL || 'Qwen/Qwen3-235B-A22B-Thinking-2507';
    const baseURL = process.env.QWEN_BASE_URL || 'https://router.huggingface.co/v1';
    const enableThinking = process.env.QWEN_ENABLE_THINKING === 'true';
    const maxContextLength = parseInt(process.env.QWEN_MAX_CONTEXT || '32768', 10);

    console.log(`🚀 Initializing Qwen3-235B-A22B-Thinking-2507 client`);
    console.log(`   Model: ${model}`);
    console.log(`   Thinking mode: ${enableThinking ? 'ALWAYS ON (required for this model)' : 'disabled'}`);
    console.log(`   Max context: ${maxContextLength} tokens (Router API limit, 256K native with self-hosting)`);

    return new QwenClient({
        apiKey,
        model,
        baseURL,
        timeout: 300000, // 5 minutes for complex reasoning with thinking mode
        enableThinking,
        maxContextLength,
    });
}
