import { r2Service } from './r2Service';
import * as cheerio from 'cheerio';

export interface ImageProcessingResult {
  html?: string;
  imageUrl?: string;
  totalProcessed: number;
  totalFound: number;
}

export interface ImageMetadata {
  questionNumber?: number | string;
  source?: string;
  customFolder?: string;
  customFilename?: string;
}

export class ImageProcessingService {
  /**
   * Processa imagens em HTML (enunciados) e faz upload para R2
   */
  async processQuestionHTML(
    html: string,
    questionNumber?: number | string,
    customFolder?: string,
    processedImagePaths?: string[]
  ): Promise<ImageProcessingResult> {
    const $ = cheerio.load(html);
    let processedCount = 0;
    let foundCount = 0;

    // Encontrar todas as imagens (data URI ou caminhos locais, mas não URLs do R2)
    const allImages = $('img');
    const imagesToProcess = allImages.filter((_, img) => {
      const src = $(img).attr('src');
      return !!(src && !src.startsWith('http')); // Processa data URI e caminhos locais
    });
    
    foundCount = imagesToProcess.length;

    // Processar cada imagem
    for (let i = 0; i < imagesToProcess.length; i++) {
      const img = imagesToProcess.eq(i);
      let imageSrc = img.attr('src');

      if (!imageSrc) continue;

      try {
        // Converter caminho local para data URI se necessário
        if (!imageSrc.startsWith('data:image/')) {
          const fs = await import('fs');
          const path = await import('path');
          
          // Converter rota da API para caminho real
          let filePath = imageSrc;
          if (imageSrc.startsWith('/api/temp-images/')) {
            const filename = imageSrc.replace('/api/temp-images/', '');
            filePath = path.join(process.cwd(), 'output', 'scraped', 'images', filename);
          } else {
            filePath = path.isAbsolute(imageSrc) 
              ? imageSrc 
              : path.join(process.cwd(), imageSrc);
          }
          
          if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Imagem não encontrada: ${filePath}`);
            continue;
          }

          // ✅ Rastrear caminho do arquivo original para cleanup posterior
          if (processedImagePaths && !processedImagePaths.includes(filePath)) {
            processedImagePaths.push(filePath);
          }
          
          const imageBuffer = fs.readFileSync(filePath);
          const ext = path.extname(filePath).toLowerCase();
          const mimeType = ext === '.png' ? 'image/png' : 
                          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.gif' ? 'image/gif' : 'image/jpeg';
          
          imageSrc = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
        }

        // Gerar nome do arquivo
        const questionPadded = questionNumber?.toString().padStart(2, '0') || 'unknown';
        const imageSuffix = foundCount > 1 ? `_${i + 1}` : '';
        const customFilename = `q${questionPadded}${imageSuffix}`;

        // Upload para R2
        const uploadResult = await this.uploadImageToR2(imageSrc, {
          questionNumber,
          source: 'question_html',
          customFolder,
          customFilename,
        });

        // Substituir pela URL do R2
        img.attr('src', uploadResult.url);
        processedCount++;
      } catch (error) {
        console.error(`❌ Erro ao processar imagem ${i + 1}:`, error);
        throw error;
      }
    }

    return {
      html: $.html(),
      totalProcessed: processedCount,
      totalFound: foundCount,
    };
  }

  /**
   * Processa uma imagem standalone (campo imagem da questão)
   */
  async processStandaloneImage(
    imagePath: string,
    questionNumber?: number | string,
    customFolder?: string
  ): Promise<ImageProcessingResult> {
    // Se for URL do R2, retorna sem processar
    if (imagePath.startsWith('http')) {
      return {
        imageUrl: imagePath,
        totalProcessed: 0,
        totalFound: 0,
      };
    }

    // Se for caminho local, converte para data URI
    let dataURI = imagePath;
    if (!imagePath.startsWith('data:image/')) {
      const fs = await import('fs');
      const path = await import('path');
      
      // Resolver caminho absoluto
      const absolutePath = path.isAbsolute(imagePath) 
        ? imagePath 
        : path.join(process.cwd(), imagePath);
      
      if (!fs.existsSync(absolutePath)) {
        console.warn(`⚠️ Imagem não encontrada: ${absolutePath}`);
        return {
          imageUrl: imagePath,
          totalProcessed: 0,
          totalFound: 0,
        };
      }
      
      // Ler arquivo e converter para base64
      const imageBuffer = fs.readFileSync(absolutePath);
      const ext = path.extname(absolutePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.gif' ? 'image/gif' : 'image/jpeg';
      
      dataURI = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    }

    try {
      const questionPadded = questionNumber?.toString().padStart(2, '0') || 'unknown';
      const customFilename = `q${questionPadded}`;

      const uploadResult = await this.uploadImageToR2(dataURI, {
        questionNumber,
        source: 'question_field',
        customFolder,
        customFilename,
      });

      console.log(`✅ Imagem standalone processada: ${customFilename}`);

      return {
        imageUrl: uploadResult.url,
        totalProcessed: 1,
        totalFound: 1,
      };
    } catch (error) {
      console.error(`❌ Erro ao processar imagem standalone:`, error);
      throw error;
    }
  }

  /**
   * Upload de imagem para R2
   */
  private async uploadImageToR2(
    dataURI: string,
    metadata: ImageMetadata
  ): Promise<{ url: string; fileKey: string; size: number }> {
    // Extrair informações do data URI
    const matches = dataURI.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Data URI inválido');
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Determinar extensão
    const extension = this.getExtensionFromMimeType(mimeType);

    // Gerar nome do arquivo - SEMPRE usar customFilename se fornecido
    const filename = metadata.customFilename 
      ? `${metadata.customFilename}.${extension}`
      : `question_img_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${extension}`;

    // Determinar pasta
    const folder = metadata.customFolder || 'questions/images';

    // Upload para R2 usando presigned URL
    const presignedResult = await r2Service.generatePresignedUploadUrl(
      filename,
      mimeType,
      folder,
      3600,
      {
        questionNumber: metadata.questionNumber?.toString() || '',
        source: metadata.source || 'question_creation',
        uploadedAt: new Date().toISOString(),
      }
    );

    // Upload do buffer para R2
    const axios = (await import('axios')).default;
    const uploadResponse = await axios.put(presignedResult.uploadUrl, buffer, {
      headers: {
        'Content-Type': mimeType,
      },
    });

    if (uploadResponse.status !== 200) {
      throw new Error(`Failed to upload to R2: ${uploadResponse.statusText}`);
    }

    const publicUrl = presignedResult.publicUrl;
    const fileKey = presignedResult.fileKey;

    return {
      url: publicUrl,
      fileKey,
      size: buffer.length,
    };
  }

  /**
   * Determina extensão baseada no MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };

    return mimeMap[mimeType] || 'jpg';
  }

  /**
   * Processa todas as imagens de uma questão
   */
  async processQuestionImages(
    question: any,
    examFolder?: string,
    processedImagePaths?: string[]
  ): Promise<any> {
    const processedQuestion = { ...question };
    let totalProcessed = 0;

    // Processar APENAS imagens no enunciado (HTML)
    // Todas as imagens vêm do scraper e são inseridas no HTML
    if (question.enunciado && question.enunciado.includes('<img')) {
      const result = await this.processQuestionHTML(
        question.enunciado,
        question.numero,
        examFolder,
        processedImagePaths
      );
      processedQuestion.enunciado = result.html;
      totalProcessed += result.totalProcessed;
    }

    // Limpar campo imagem standalone (não é usado)
    processedQuestion.imagem = undefined;

    return {
      question: processedQuestion,
      imagesProcessed: totalProcessed,
    };
  }

  /**
   * Processa imagens de múltiplas questões
   */
  async processMultipleQuestions(
    questions: any[],
    examFolder?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ questions: any[]; processedImagePaths: string[] }> {
    const processedQuestions: any[] = [];
    const processedImagePaths: string[] = []; // ✅ Rastrear imagens processadas
    let totalImagesProcessed = 0;

    console.log(`🖼️ Processando imagens de ${questions.length} questões...`);

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      try {
        const result = await this.processQuestionImages(question, examFolder, processedImagePaths);
        processedQuestions.push(result.question);
        totalImagesProcessed += result.imagesProcessed;

        if (onProgress) {
          onProgress(i + 1, questions.length);
        }

        // Silencioso - não loga para evitar poluição
      } catch (error) {
        console.error(`❌ Erro ao processar questão ${i + 1}:`, error);
        throw error;
      }
    }

    console.log(`✅ Total: ${totalImagesProcessed} imagens processadas`);
    console.log(`📁 Total de arquivos rastreados: ${processedImagePaths.length}`);

    return { questions: processedQuestions, processedImagePaths };
  }
}

export const imageProcessingService = new ImageProcessingService();
