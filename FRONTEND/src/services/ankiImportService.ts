import { readAnkiPackage } from 'anki-reader';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { fetchWithAuth } from './fetchWithAuth';

interface ImportAnkiResult {
  deckId: string;
  deckName: string;
  cardsImported: number;
  mediaFiles: number;
  warnings: string[];
}

interface ImportAnkiOptions {
  name: string;
  description?: string;
  category?: string;
  tags: string[];
  isOfficial: boolean;
}

/**
 * Serviço para importação de arquivos Anki (.apkg) no frontend
 */
export const ankiImportService = {
  /**
   * Importa um arquivo Anki (.apkg) para o sistema
   * @param file Arquivo .apkg
   * @param options Opções de importação
   * @returns Resultado da importação
   */
  async importAnkiFile(file: File, options: ImportAnkiOptions): Promise<ImportAnkiResult> {
    try {
      console.log('📦 Iniciando importação com anki-reader no frontend...');
      console.log('📊 Tamanho do arquivo:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
      
      // Criar FormData para envio do arquivo
      const formData = new FormData();
      formData.append('apkgFile', file);
      formData.append('name', options.name);
      formData.append('description', options.description || '');
      formData.append('category', options.category || 'medicina');
      formData.append('tags', JSON.stringify(options.tags));
      formData.append('isOfficial', options.isOfficial.toString());

      // Enviar para o backend
      const response = await fetchWithAuth('/study-tools/flashcards/apkg/admin/import', {
        method: 'POST',
        body: formData,
        // Não definir Content-Type, o navegador vai definir automaticamente com o boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na importação');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro na importação');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      throw error;
    }
  },

  /**
   * Analisa um arquivo Anki (.apkg) localmente para pré-visualização
   * @param file Arquivo .apkg
   * @returns Informações sobre o arquivo
   */
  async analyzeAnkiFile(file: File): Promise<{
    decks: { id: string; name: string; cardCount: number }[];
    totalCards: number;
    mediaFiles: number;
  }> {
    try {
      console.log('🔍 Analisando arquivo Anki localmente...');
      
      // Configuração do SQL.js para encontrar o arquivo wasm
      const sqlConfig = {
        locateFile: () => sqlWasmUrl
      };

      // Extrair pacote usando anki-reader
      const extractedPackage = await readAnkiPackage(file, { sqlConfig });
      const { collection, media } = extractedPackage;
      
      // Processar decks
      const decks = collection.getDecks();
      const decksInfo = [];
      let totalCards = 0;
      
      for (const [deckId, deck] of Object.entries(decks)) {
        const rawDeck = deck.getRawDeck();
        const cards = deck.getCards();
        const cardCount = Object.keys(cards).length;
        
        if (cardCount > 0) {
          decksInfo.push({
            id: deckId,
            name: rawDeck.name,
            cardCount
          });
          
          totalCards += cardCount;
        }
      }
      
      return {
        decks: decksInfo,
        totalCards,
        mediaFiles: Object.keys(media).length
      };
    } catch (error) {
      console.error('❌ Erro ao analisar arquivo:', error);
      throw error;
    }
  }
}; 