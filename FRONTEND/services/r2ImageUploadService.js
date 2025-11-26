import { supabaseAuthService } from '@/lib/services/supabaseAuthService';

class R2ImageUploadService {
  constructor() {
    this.backendUrl = (typeof window !== 'undefined' && window.location.origin) 
      ? `${window.location.origin}/api`
      : 'http://localhost:3000/api';
    this.maxRetries = 2; // MÁXIMO 2 tentativas
    this.retryDelay = 1000; // 1 segundo entre tentativas
    // 🛡️ CIRCUIT BREAKER - Parar após muitos erros
    this.failureCount = 0;
    this.maxFailures = 5;
    this.circuitBreakerTimeout = 60000; // 1 minuto
    this.lastFailureTime = 0;
    this.isCircuitOpen = false;
  }

  /**
   * Verificar se circuit breaker está ativo
   */
  checkCircuitBreaker() {
    if (this.isCircuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.circuitBreakerTimeout) {
        console.log('🔄 Circuit breaker resetado - tentando novamente');
        this.isCircuitOpen = false;
        this.failureCount = 0;
      } else {
        const remainingTime = Math.ceil((this.circuitBreakerTimeout - (now - this.lastFailureTime)) / 1000);
        throw new Error(`🛡️ CIRCUIT BREAKER ATIVO - Aguarde ${remainingTime}s antes de tentar novamente`);
      }
    }
  }

  /**
   * Registrar falha no circuit breaker
   */
  registerFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.maxFailures) {
      this.isCircuitOpen = true;
      console.error(`🚨 CIRCUIT BREAKER ATIVADO após ${this.failureCount} falhas consecutivas`);
    }
  }

  /**
   * Registrar sucesso no circuit breaker
   */
  registerSuccess() {
    this.failureCount = 0;
    this.isCircuitOpen = false;
  }

  /**
   * Validar antes de fazer upload
   */
  validateBeforeUpload(dataURI) {
    // Verificar circuit breaker
    this.checkCircuitBreaker();
    
    // Verificar se é uma imagem válida
    if (!this.isValidImageDataURI(dataURI)) {
      throw new Error('❌ Data URI inválido para imagem');
    }
    
    // Verificar autenticação
    const token = supabaseAuthService.getToken();
    if (!token) {
      console.warn('⚠️ ATENÇÃO: Upload sem autenticação - pode falhar');
    }
    
    // Verificar se backend está respondendo
    if (this.failureCount > 2) {
      console.warn(`⚠️ ATENÇÃO: ${this.failureCount} falhas recentes - sistema pode estar instável`);
    }
  }

  /**
   * Obter headers com autenticação
   */
  getRequestHeaders() {
    const token = supabaseAuthService.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('⚠️ Token não encontrado - requisição sem autenticação');
    }
    
    return headers;
  }

  /**
   * Fazer requisição com retry limitado
   */
  async fetchWithRetry(url, options, retryCount = 0) {
    try {
      console.log(`🔄 Tentativa ${retryCount + 1}/${this.maxRetries + 1} para: ${url}`);
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Tentativa ${retryCount + 1} falhou:`, error.message);
      
      if (retryCount < this.maxRetries) {
        console.log(`⏳ Aguardando ${this.retryDelay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.fetchWithRetry(url, options, retryCount + 1);
      } else {
        console.error(`💥 TODAS AS TENTATIVAS FALHARAM - PARANDO AQUI!`);
        throw new Error(`Falha após ${this.maxRetries + 1} tentativas: ${error.message}`);
      }
    }
  }

  /**
   * Converte data URI para Blob
   */
  dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeString });
  }

  /**
   * Upload de imagem para R2 e retorna URL pública
   */
  async uploadImageToR2(dataURI, metadata = {}) {
    try {
      console.log('📤 Iniciando upload de imagem para R2...');
      
      // 🛡️ VALIDAÇÃO PRÉVIA - Evitar loop infinito
      this.validateBeforeUpload(dataURI);
      
      // Converter data URI para blob
      const blob = this.dataURItoBlob(dataURI);
      
      // Determinar extensão baseada no tipo MIME
      const mimeType = dataURI.split(',')[0].split(':')[1].split(';')[0];
      const extension = this.getExtensionFromMimeType(mimeType);
      
      // Gerar nome do arquivo
      let filename;
      if (metadata.customFilename) {
        // Usar nome customizado se fornecido
        filename = `${metadata.customFilename}.${extension}`;
      } else {
        // Gerar nome único padrão
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        filename = `question_img_${timestamp}_${randomId}.${extension}`;
      }
      
      // Determinar pasta
      const folder = metadata.customFolder || 'questions/images';
      
      // Solicitar presigned URL do backend
      const presignedResponse = await this.fetchWithRetry(`${this.backendUrl}/r2/presigned-upload`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({
          filename,
          contentType: mimeType,
          folder: folder,
          metadata: {
            ...metadata,
            source: 'question_creation',
            uploadedAt: new Date().toISOString()
          }
        })
      });

      if (!presignedResponse.ok) {
        throw new Error(`Falha ao obter presigned URL: ${presignedResponse.statusText}`);
      }

      const { uploadUrl, publicUrl, fileKey } = await presignedResponse.json();
      
      // Upload direto para R2 usando presigned URL
      const uploadResponse = await this.fetchWithRetry(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': mimeType
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Falha no upload para R2: ${uploadResponse.statusText}`);
      }

      // Notificar backend sobre conclusão do upload
      await this.notifyUploadComplete(fileKey, {
        originalName: filename,
        size: blob.size,
        type: mimeType,
        ...metadata
      });

      console.log('✅ Upload para R2 concluído:', publicUrl);
      
      return {
        success: true,
        url: publicUrl,
        fileKey,
        size: blob.size
      };

    } catch (error) {
      console.error('❌ Erro no upload para R2:', error);
      throw error;
    }
  }

  /**
   * Upload múltiplas imagens de uma vez
   */
  async uploadMultipleImages(dataURIs, metadata = {}) {
    const results = [];
    
    for (let i = 0; i < dataURIs.length; i++) {
      try {
        const result = await this.uploadImageToR2(dataURIs[i], {
          ...metadata,
          imageIndex: i + 1,
          totalImages: dataURIs.length
        });
        results.push(result);
      } catch (error) {
        console.error(`❌ Erro no upload da imagem ${i + 1}:`, error);
        results.push({
          success: false,
          error: error.message,
          index: i
        });
      }
    }
    
    return results;
  }

  /**
   * Processar HTML de questão substituindo data URIs por URLs do R2
   */
  async processQuestionHTML(html, questionNumber = null, customFolder = null) {
    try {
      // Encontrar todos os data URIs de imagem no HTML
      const dataUriRegex = /src="(data:image\/[^"]+)"/g;
      const matches = [];
      let match;
      
      while ((match = dataUriRegex.exec(html)) !== null) {
        matches.push({
          fullMatch: match[0],
          dataUri: match[1]
        });
      }

      if (matches.length === 0) {
        return { html, uploadedImages: [], totalFound: 0, totalProcessed: 0 };
      }

      console.log(`🔄 Processando ${matches.length} imagens na questão ${questionNumber || 'N/A'}`);

      const uploadedImages = [];
      let processedHTML = html;

      // Upload cada imagem e substituir no HTML
      for (let i = 0; i < matches.length; i++) {
        const { fullMatch, dataUri } = matches[i];
        
        try {
          // Gerar nome do arquivo: q01-img1, q01-img2, etc.
          let customFilename = null;
          if (questionNumber) {
            const questionNumberPadded = questionNumber.toString().padStart(2, '0');
            customFilename = matches.length > 1 
              ? `q${questionNumberPadded}-img${i + 1}`
              : `q${questionNumberPadded}`;
          }
          
          const uploadResult = await this.uploadImageToR2(dataUri, {
            questionNumber: questionNumber,
            imageIndex: i + 1,
            totalImages: matches.length,
            customFolder: customFolder,
            customFilename: customFilename,
          });

                     if (uploadResult.success) {
             // Substituir data URI pela URL do R2
             const newSrc = `src="${uploadResult.url}"`;
             processedHTML = processedHTML.replace(fullMatch, newSrc);
             
             uploadedImages.push({
               originalDataUri: dataUri,
               r2Url: uploadResult.url,
               fileKey: uploadResult.fileKey,
               size: uploadResult.size
             });

             console.log(`✅ Imagem ${i + 1} processada: ${uploadResult.url}`);
           } else {
             throw new Error(`Falha no upload da imagem ${i + 1} para R2`);
           }
         } catch (error) {
           console.error(`❌ Erro ao processar imagem ${i + 1}:`, error);
           // SEM FALLBACK - Falhar completamente
           throw new Error(`Falha no processamento da imagem ${i + 1}: ${error.message}`);
         }
      }

             // Verificar se todas as imagens foram processadas
       if (uploadedImages.length !== matches.length) {
         throw new Error(`Apenas ${uploadedImages.length}/${matches.length} imagens foram processadas com sucesso`);
       }

       return {
         html: processedHTML,
         uploadedImages,
         totalProcessed: uploadedImages.length,
         totalFound: matches.length
       };

     } catch (error) {
       console.error('❌ Erro ao processar HTML da questão:', error);
       // SEM FALLBACK - Falhar completamente
       throw error;
     }
  }

  /**
   * Notificar backend sobre upload concluído
   */
  async notifyUploadComplete(fileKey, metadata) {
    try {
      await this.fetchWithRetry(`${this.backendUrl}/r2/upload-complete`, {
        method: 'POST',
        headers: this.getRequestHeaders(),
        body: JSON.stringify({
          fileKey,
          metadata
        })
      });
    } catch (error) {
      console.warn('⚠️ Falha ao notificar conclusão do upload:', error);
    }
  }

  /**
   * Obter extensão de arquivo a partir do MIME type
   */
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };
    
    return mimeToExt[mimeType] || 'jpg';
  }

  /**
   * Validar se data URI é uma imagem válida
   */
  isValidImageDataURI(dataURI) {
    if (!dataURI || typeof dataURI !== 'string') {
      return false;
    }
    
    return dataURI.startsWith('data:image/') && dataURI.includes(';base64,');
  }

  /**
   * Extrair estatísticas de tamanho de imagens
   */
  getImageStats(dataURIs) {
    const stats = {
      count: dataURIs.length,
      totalSize: 0,
      averageSize: 0,
      types: {}
    };

    dataURIs.forEach(dataURI => {
      const blob = this.dataURItoBlob(dataURI);
      const mimeType = dataURI.split(',')[0].split(':')[1].split(';')[0];
      
      stats.totalSize += blob.size;
      stats.types[mimeType] = (stats.types[mimeType] || 0) + 1;
    });

    stats.averageSize = stats.count > 0 ? stats.totalSize / stats.count : 0;
    
    return stats;
  }
}

export const r2ImageUploadService = new R2ImageUploadService();
export default r2ImageUploadService;
