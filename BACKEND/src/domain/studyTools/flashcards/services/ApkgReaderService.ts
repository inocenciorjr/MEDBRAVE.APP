import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { readDatabaseFrom, ZipHandler } from 'apkg-reader.js';
import { firestore, storage } from '../../../../config/firebaseAdmin';
import * as admin from 'firebase-admin';

// Interfaces
export interface ImportDeckData {
  name: string;
  description: string;
  category: string;
  tags: string[];
  isOfficial: boolean;
  createdBy: string;
}

export interface ImportResult {
  deckId: string;
  deckName: string;
  cardsImported: number;
  mediaFiles: number;
  warnings: string[];
}

interface AnkiNote {
  id: number;
  modelName: string;
  fields: string[];
  tags: string[];
}

interface AnkiExtractResult {
  decks: Array<{id: number; name: string}>;
  notes: AnkiNote[];
  media: Record<string, Buffer>;
}

export class ApkgReaderService {
  private db: any; // Firestore
  private storage: any; // Storage bucket

  constructor() {
    this.db = firestore;
    this.storage = storage.bucket();
  }

  /**
   * Importa um arquivo Anki (.apkg) e salva no Firebase
   * @param apkgBuffer Buffer do arquivo .apkg
   * @param deckData Dados do deck a ser criado
   * @param userId ID do usuário que está importando
   */
  async importApkg(
    apkgBuffer: Buffer,
    deckData: ImportDeckData,
    userId: string
  ): Promise<ImportResult> {
    console.log('🔄 Iniciando extração do arquivo Anki...');
    
    const warnings: string[] = [];
    const tempFilePath = path.join(process.cwd(), 'uploads', `temp-${uuidv4()}.apkg`);
    
    try {
      // Salvar o buffer como arquivo temporário
      fs.writeFileSync(tempFilePath, apkgBuffer);
      
      // Extrair conteúdo do arquivo Anki
      const zip = new ZipHandler(tempFilePath);
      const db = await readDatabaseFrom(zip);
              const rawNotes = await db.getNotes();
        const result = {
          decks: await db.getDeckNames(),
          notes: rawNotes.map(note => ({
            id: note.id,
            modelName: 'Unknown', // Valor padrão
            fields: note.flds ? note.flds.split('\x1f') : [], // Separador de campos do Anki
            tags: note.tags ? note.tags.split(' ') : []
          })),
          media: await zip.getMediaFiles()
        } as AnkiExtractResult;
      
      console.log(`📊 Conteúdo extraído: ${result.decks.length} decks, ${result.notes.length} notas, ${Object.keys(result.media || {}).length} arquivos de mídia`);
      
      // Criar deck no Firebase
      const deckId = await this.createDeck(deckData, userId);
      
      // Processar e salvar os flashcards
      const cardsImported = await this.processFlashcards(result, deckId, userId);
      
      // Processar e salvar os arquivos de mídia
      const mediaFiles = await this.processMediaFiles(result.media || {}, deckId);
      
      console.log(`✅ Importação concluída: ${cardsImported} flashcards e ${mediaFiles} arquivos de mídia`);
      
      return {
        deckId,
        deckName: deckData.name,
        cardsImported,
        mediaFiles,
        warnings
      };
    } catch (error: unknown) {
      console.error('❌ Erro ao importar arquivo Anki:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao importar arquivo Anki: ${errorMessage}`);
    } finally {
      // Limpar arquivo temporário
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Cria um novo deck no Firebase
   */
  private async createDeck(deckData: ImportDeckData, userId: string): Promise<string> {
    const deckRef = this.db.collection('decks').doc();
    
    await deckRef.set({
      name: deckData.name,
      description: deckData.description,
      category: deckData.category,
      tags: deckData.tags,
      isOfficial: deckData.isOfficial,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      cardCount: 0,
      source: 'apkg_import',
      isPublic: false, // 🔧 FIX: Decks importados devem ser privados por padrão
      isDeleted: false,
      // 🔧 FIX: Adicionar campos necessários para hierarquia
      hierarchy: deckData.category || 'Importados',
      userId: userId // 🔧 FIX: Garantir que o userId está definido
    });
    
    return deckRef.id;
  }

  /**
   * Processa os flashcards extraídos do arquivo Anki
   */
  private async processFlashcards(
    result: AnkiExtractResult,
    deckId: string,
    userId: string
  ): Promise<number> {
    const batch = this.db.batch();
    let cardCount = 0;
    
    // Mapear notas para flashcards
    for (const note of result.notes) {
      try {
        // Extrair frente e verso do cartão
        const front = note.fields[0] || '';
        const back = note.fields[1] || '';
        
        // Pular cartões vazios
        if (!front.trim() && !back.trim()) {
          continue;
        }
        
        // Criar documento para o flashcard
        const flashcardRef = this.db.collection('flashcards').doc();
        
        batch.set(flashcardRef, {
          deckId,
          front,
          back,
          tags: note.tags || [],
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          isArchived: false,
          isDeleted: false,
          metadata: {
            importedAt: admin.firestore.FieldValue.serverTimestamp(),
            originalNoteId: note.id,
            originalModelName: note.modelName
          }
        });
        
        cardCount++;
      } catch (error) {
        console.warn(`⚠️ Erro ao processar nota ${note.id}:`, error);
      }
    }
    
    // Atualizar contador de cartões no deck
    const deckRef = this.db.collection('decks').doc(deckId);
    batch.update(deckRef, { cardCount });
    
    // Salvar todas as alterações
    await batch.commit();
    
    return cardCount;
  }

  /**
   * Processa e salva os arquivos de mídia do Anki
   */
  private async processMediaFiles(
    media: Record<string, Buffer>,
    deckId: string
  ): Promise<number> {
    let mediaCount = 0;
    const mediaUrls: Record<string, string> = {};
    
    for (const [filename, buffer] of Object.entries(media)) {
      try {
        // Ignorar arquivos vazios ou inválidos
        if (!buffer || buffer.length === 0) {
          continue;
        }
        
        // Caminho do arquivo no storage
        const storagePath = `decks/${deckId}/media/${filename}`;
        
        // Upload do arquivo para o storage
        const file = this.storage.file(storagePath);
        
        await file.save(buffer, {
          metadata: {
            contentType: this.getContentType(filename)
          }
        });
        
        // Obter URL pública
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-01-2500' // Data bem distante no futuro
        });
        
        mediaUrls[filename] = url;
        mediaCount++;
      } catch (error) {
        console.warn(`⚠️ Erro ao processar arquivo de mídia ${filename}:`, error);
      }
    }
    
    // Salvar mapeamento de URLs no Firestore
    if (mediaCount > 0) {
      await this.db.collection('decks').doc(deckId).collection('metadata').doc('media').set({
        mediaUrls,
        count: mediaCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return mediaCount;
  }

  /**
   * Determina o tipo de conteúdo com base na extensão do arquivo
   */
  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.gif':
        return 'image/gif';
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.ogg':
        return 'audio/ogg';
      case '.mp4':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }
}