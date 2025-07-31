import { Request, Response } from 'express';
import { firestore } from 'firebase-admin';

export class AdminFlashcardController {
  private db: firestore.Firestore;
  private cache = new Map<string, { data: any, expiresAt: number }>();
  private readonly CACHE_TTL = 30 * 1000; // 30 segundos

  constructor(db: firestore.Firestore) {
    this.db = db;
  }

  // Método para cache genérico
  private getCacheKey(userId: string, collection?: string): string {
    return `decks_${userId}_${collection || 'all'}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL
    });
  }

  /**
   * Lista todos os decks de flashcards (OTIMIZADO)
   */
  async getAllDecks(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário está autenticado
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Parâmetros de paginação - limitando mais agressivamente
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000); // Máximo 1.000 (reduzido de 10.000)
      const collection = req.query.collection as string;
      const sortBy = req.query.sortBy as string || 'createdAt';
      const sortOrder = req.query.sortOrder as string || 'desc';

      // Verificar cache primeiro
      const cacheKey = this.getCacheKey(user.id, collection);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      // Se for admin, buscar todos os decks; se não, buscar apenas os do usuário
      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // OTIMIZAÇÃO: Query única para buscar decks e metadados
      let query: any = this.db.collection('decks');

      // Filtro por usuário
      if (!isAdmin) {
        query = query.where('userId', 'in', [user.id, user.email]);
      }

      // Filtro por coleção
      if (collection && collection !== 'all') {
        query = query.where('collection', '==', collection);
      }

      // Ordenação
      const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
      query = query.orderBy(sortBy, orderDirection);

      // OTIMIZAÇÃO: Usar limit menor para primeira carga
      const effectiveLimit = page === 1 ? Math.min(limit, 200) : limit;

      // Paginação
      if (page > 1) {
        const offset = (page - 1) * effectiveLimit;
        query = query.offset(offset);
      }

      query = query.limit(effectiveLimit);

      // Executar query principal
      const decksSnapshot = await query.get();

      const decks = decksSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      // OTIMIZAÇÃO: Usar cache para contagem (menos preciso, mas mais rápido)
      let total = decks.length;
      let collections: string[] = [];

      // Para primeira página, fazer queries de metadados
      if (page === 1) {
        try {
          // Query de contagem paralela (com timeout)
          const countPromise = this.getApproximateCount(isAdmin, user, collection);

          // Query de coleções paralela (com timeout) 
          const collectionsPromise = this.getCollections(isAdmin, user);

          // Executar em paralelo com timeout
          const [countResult, collectionsResult] = await Promise.allSettled([
            Promise.race([countPromise, this.timeout(2000)]), // 2s timeout
            Promise.race([collectionsPromise, this.timeout(2000)]) // 2s timeout
          ]);

          if (countResult.status === 'fulfilled') {
            total = countResult.value;
          }

          if (collectionsResult.status === 'fulfilled') {
            collections = collectionsResult.value;
          }
        } catch (error) {
          // Se falhar, usar valores padrão
          console.warn('Metadados falharam, usando valores padrão:', error);
        }
      }

      const totalPages = Math.ceil(total / effectiveLimit);

      const result = {
        success: true,
        data: decks,
        pagination: {
          page,
          limit: effectiveLimit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          collections,
          currentCollection: collection || 'all'
        }
      };

      // Cache apenas para primeira página
      if (page === 1) {
        this.setCache(cacheKey, result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao listar decks:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar decks de flashcards',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Método auxiliar para contagem aproximada
  private async getApproximateCount(isAdmin: boolean, user: any, collection?: string): Promise<number> {
    let countQuery: any = this.db.collection('decks');
    
    if (!isAdmin) {
      countQuery = countQuery.where('userId', 'in', [user.id, user.email]);
    }
    
    if (collection && collection !== 'all') {
      countQuery = countQuery.where('collection', '==', collection);
    }
    
    const countSnapshot = await countQuery.count().get();
    return countSnapshot.data().count;
  }

  // Método auxiliar para buscar coleções
  private async getCollections(isAdmin: boolean, user: any): Promise<string[]> {
    let collectionsQuery: any = this.db.collection('decks');
    
    if (!isAdmin) {
      collectionsQuery = collectionsQuery.where('userId', 'in', [user.id, user.email]);
    }
    
    collectionsQuery = collectionsQuery.select('collection');
    
    const collectionsSnapshot = await collectionsQuery.get();
    const collectionsSet = new Set(
      collectionsSnapshot.docs
        .map((doc: any) => doc.data().collection)
        .filter(Boolean)
    );
    const collections = Array.from(collectionsSet).sort() as string[];
    
    return collections;
  }

  // Método auxiliar para timeout
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    );
  }

  /**
   * Obtém detalhes de um deck específico
   */
  async getDeckById(req: Request, res: Response): Promise<void> {
    try {
      const { deckId } = req.params;
      
      const deckDoc = await this.db.collection('decks').doc(deckId).get();
      
      if (!deckDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Deck não encontrado'
        });
        return;
      }

      // Buscar os cards deste deck
      const cardsSnapshot = await this.db
        .collection('flashcards')
        .where('deckId', '==', deckId)
        .get();

      const cards = cardsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        data: {
          deck: {
            id: deckDoc.id,
            ...deckDoc.data()
          },
          cards
        }
      });
    } catch (error) {
      console.error('Erro ao obter deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter detalhes do deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Altera o status de publicação de um deck (público/privado)
   */
  async toggleDeckPublicStatus(req: Request, res: Response): Promise<void> {
    try {
      const { deckId } = req.params;
      const { isPublic } = req.body;

      if (typeof isPublic !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'O parâmetro isPublic deve ser um booleano'
        });
        return;
      }

      const deckRef = this.db.collection('decks').doc(deckId);
      const deckDoc = await deckRef.get();

      if (!deckDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Deck não encontrado'
        });
        return;
      }

      await deckRef.update({
        isPublic,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        success: true,
        message: `Deck ${isPublic ? 'publicado' : 'despublicado'} com sucesso`,
        data: {
          id: deckId,
          isPublic
        }
      });
    } catch (error) {
      console.error('Erro ao alterar status do deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao alterar status de publicação do deck',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Exclui um deck e todos os seus cards
   */
  async deleteDeck(req: Request, res: Response): Promise<void> {
    try {
      const { deckId } = req.params;
      const user = (req as any).user;
      
      console.log(`[DELETE_DECK] Tentando excluir deck: ${deckId}`);
      console.log(`[DELETE_DECK] Usuário: ${user?.id} (${user?.email})`);
      
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      // Verificar se o deck existe
      const deckRef = this.db.collection('decks').doc(deckId);
      const deckDoc = await deckRef.get();
      
      console.log(`[DELETE_DECK] Deck existe: ${deckDoc.exists}`);
      
      if (!deckDoc.exists) {
        // Vamos buscar se existe algum deck similar para debug
        console.log(`[DELETE_DECK] Buscando decks similares para debug...`);
        const similarDecks = await this.db.collection('decks')
          .where('userId', '==', user.id)
          .limit(5)
          .get();
        
        console.log(`[DELETE_DECK] Decks encontrados para o usuário: ${similarDecks.size}`);
        similarDecks.docs.forEach(doc => {
          console.log(`[DELETE_DECK] - ID: ${doc.id}, Nome: ${doc.data().name}`);
        });
        
        res.status(404).json({
          success: false,
          message: 'Deck não encontrado',
          debug: {
            deckId,
            userId: user.id,
            similarDecksCount: similarDecks.size
          }
        });
        return;
      }

      const deckData = deckDoc.data();
      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;
      
      console.log(`[DELETE_DECK] Dados do deck:`, {
        deckUserId: deckData?.userId,
        userIdAuth: user.id,
        userEmail: user.email,
        isAdmin
      });
      
      // Verificar se o usuário é o dono do deck ou admin
      if (!isAdmin && deckData?.userId !== user.id && deckData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para excluir este deck'
        });
        return;
      }

      // Iniciar uma transação para excluir o deck e seus cards
      await this.db.runTransaction(async (transaction) => {
        // Buscar todos os cards do deck
        const cardsSnapshot = await this.db
          .collection('flashcards')
          .where('deckId', '==', deckId)
          .get();
        
        console.log(`[DELETE_DECK] Cards encontrados para exclusão: ${cardsSnapshot.size}`);
        
        // Excluir cada card
        cardsSnapshot.docs.forEach(doc => {
          transaction.delete(doc.ref);
        });
        
        // Excluir o deck
        transaction.delete(deckRef);
      });

      console.log(`[DELETE_DECK] ✅ Deck ${deckId} excluído com sucesso`);

      res.status(200).json({
        success: true,
        message: 'Deck e cards excluídos com sucesso',
        data: { id: deckId }
      });
    } catch (error) {
      console.error('[DELETE_DECK] ❌ Erro ao excluir deck:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir deck e seus cards',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Exclui múltiplos decks em lote (até 100 por vez)
   */
  async deleteDecksBatch(req: Request, res: Response): Promise<void> {
    try {
      const { deckIds } = req.body;
      const user = (req as any).user;
      

      
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      if (!deckIds || !Array.isArray(deckIds) || deckIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Lista de IDs de decks é obrigatória'
        });
        return;
      }

      if (deckIds.length > 500) {
        res.status(400).json({
          success: false,
          message: 'Máximo de 500 decks por lote'
        });
        return;
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;
      const results: {
        success: Array<{ id: string; name: string; cardsDeleted: number }>;
        failed: Array<{ id: string; error: string }>;
        notFound: string[];
        unauthorized: string[];
      } = {
        success: [],
        failed: [],
        notFound: [],
        unauthorized: []
      };

      // 🚀 SISTEMA DE BATCH DINÂMICO: Calcula tamanho ideal baseado no número de cards
      const batches = await this.createDynamicBatches(deckIds, user, isAdmin);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const currentBatch = batches[batchIndex];

        try {
          // 🚀 OTIMIZAÇÃO: Usar batched writes para melhor performance em lotes grandes
          const batch = this.db.batch();
          
          // Buscar todos os decks do lote atual
          const deckPromises = currentBatch.map((deckId: string) => 
            this.db.collection('decks').doc(deckId).get()
          );
          
          const deckDocs = await Promise.all(deckPromises);
          
          // Validar permissões e coletar dados
          const validDecks: Array<{ id: string; ref: firestore.DocumentReference; data: any }> = [];
          
          for (let i = 0; i < deckDocs.length; i++) {
            const deckDoc = deckDocs[i];
            const deckId = currentBatch[i];
            
            if (!deckDoc.exists) {
              results.notFound.push(deckId);
              continue;
            }
            
            const deckData = deckDoc.data();
            
            // Verificar permissões
            if (!isAdmin && deckData?.userId !== user.id && deckData?.userId !== user.email) {
              results.unauthorized.push(deckId);
              continue;
            }
            
            validDecks.push({ id: deckId, ref: deckDoc.ref, data: deckData });
          }

          // 🚀 OTIMIZAÇÃO: Buscar cards em paralelo para todos os decks válidos
          const cardPromises = validDecks.map(deck => 
            this.db.collection('flashcards').where('deckId', '==', deck.id).get()
          );
          
          const cardSnapshots = await Promise.all(cardPromises);
          
          // Adicionar exclusões ao batch
          let totalCards = 0;
          cardSnapshots.forEach((snapshot, index) => {
            const deck = validDecks[index];
            totalCards += snapshot.size;
            
            // Adicionar exclusão de cards ao batch
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            // Adicionar exclusão do deck ao batch
            batch.delete(deck.ref);
            
            results.success.push({
              id: deck.id,
              name: deck.data?.name || 'Sem nome',
              cardsDeleted: snapshot.size
            });
          });

          // 🚀 EXECUTAR BATCH (mais rápido que transação)
          await batch.commit();
          
        } catch (error) {
          
          // 🚨 IMPORTANTE: Marcar todos os decks do lote como falhados
          currentBatch.forEach((deckId: string) => {
            results.failed.push({
              id: deckId,
              error: error instanceof Error ? error.message : 'Erro desconhecido'
            });
          });
        }
      }

      const totalRequested = deckIds.length;
      const totalSuccess = results.success.length;
      const totalFailed = results.failed.length + results.notFound.length + results.unauthorized.length;

      // 🚨 CORREÇÃO: Só reportar sucesso se TODOS os decks foram excluídos
      const allSuccessful = totalFailed === 0;
      const hasPartialSuccess = totalSuccess > 0 && totalFailed > 0;

      // 🚨 CORREÇÃO: Status HTTP e success baseado no resultado real
      const statusCode = allSuccessful ? 200 : hasPartialSuccess ? 207 : 400;
      const message = allSuccessful 
        ? `${totalSuccess}/${totalRequested} decks excluídos com sucesso`
        : hasPartialSuccess
        ? `Exclusão parcial: ${totalSuccess}/${totalRequested} decks excluídos, ${totalFailed} falharam`
        : `Falha na exclusão: ${totalFailed}/${totalRequested} decks falharam`;

      res.status(statusCode).json({
        success: allSuccessful,
        partialSuccess: hasPartialSuccess,
        message: message,
        data: {
          summary: {
            requested: totalRequested,
            success: totalSuccess,
            failed: totalFailed,
            notFound: results.notFound.length,
            unauthorized: results.unauthorized.length,
            allSuccessful: allSuccessful,
            hasPartialSuccess: hasPartialSuccess
          },
          details: results
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro ao excluir decks em lote',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista todos os decks da comunidade
   */
  async getCommunityDecks(_req: Request, res: Response): Promise<void> {
    try {
      const decksSnapshot = await this.db
        .collection('decks')
        .where('isPublic', '==', true)
        .get();

      const decks = decksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({
        success: true,
        data: decks
      });
    } catch (error) {
      console.error('Erro ao listar decks da comunidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar decks da comunidade',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Obtém estatísticas sobre os flashcards
   */
  async getFlashcardStats(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário está autenticado
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Se for admin, buscar estatísticas globais; se não, buscar apenas do usuário
      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;
      
      let totalDecks = 0;
      let publicDecks = 0;
      let totalCards = 0;
      let usersWithDecks = 0;

      if (isAdmin) {
        // Admin: estatísticas globais
        const decksSnapshot = await this.db.collection('decks').get();
        totalDecks = decksSnapshot.size;
        
        const publicDecksSnapshot = await this.db
          .collection('decks')
          .where('isPublic', '==', true)
          .get();
        publicDecks = publicDecksSnapshot.size;
        
        const cardsSnapshot = await this.db.collection('flashcards').get();
        totalCards = cardsSnapshot.size;
        
        const userDecksSnapshot = await this.db
          .collection('decks')
          .select('userId')
          .get();
        
        const uniqueUsers = new Set(userDecksSnapshot.docs.map(doc => doc.data().userId));
        usersWithDecks = uniqueUsers.size;
        
      } else {
        // Usuário normal: apenas suas estatísticas
        
        // Contar decks do usuário (buscar por UID e email para compatibilidade)
        const userDecksSnapshot = await this.db
          .collection('decks')
          .where('userId', 'in', [user.id, user.email])
          .get();
        totalDecks = userDecksSnapshot.size;
        
        // Contar decks públicos do usuário
        const userPublicDecksSnapshot = await this.db
          .collection('decks')
          .where('userId', 'in', [user.id, user.email])
          .where('isPublic', '==', true)
          .get();
        publicDecks = userPublicDecksSnapshot.size;
        
        // Contar cards do usuário - buscar por todos os deckIds do usuário
        const userDeckIds = userDecksSnapshot.docs.map(doc => doc.id);
        
        if (userDeckIds.length > 0) {
          // Firestore tem limite de 10 itens no 'in', então processar em batches
          const batchSize = 10;
          let totalCardsCount = 0;
          
          for (let i = 0; i < userDeckIds.length; i += batchSize) {
            const batch = userDeckIds.slice(i, i + batchSize);
            const cardsSnapshot = await this.db
              .collection('flashcards')
              .where('deckId', 'in', batch)
              .get();
            totalCardsCount += cardsSnapshot.size;
          }
          totalCards = totalCardsCount;
        }
        
        usersWithDecks = 1; // O próprio usuário
      }
      
      res.status(200).json({
        success: true,
        data: {
          totalDecks,
          publicDecks,
          privateDecks: totalDecks - publicDecks,
          totalCards,
          usersWithDecks: usersWithDecks
        }
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas de flashcards:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas de flashcards',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Nova função: Obter coleções públicas para a comunidade
  async getCommunityCollections(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const collections = await this.db
        .collection('collections')
        .where('isPublic', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();

      const collectionsData = [];
      
      for (const doc of collections.docs) {
        const collectionData: any = {
          id: doc.id,
          ...doc.data()
        };
        
        // Buscar decks da coleção para mostrar preview
        const decksQuery = await this.db
          .collection('decks')
          .where('userId', '==', collectionData.userId)
          .where('collection', '==', collectionData.name)
          .orderBy('createdAt', 'desc')
          .get();
        
        collectionData.decks = decksQuery.docs.map(deckDoc => ({
          id: deckDoc.id,
          ...deckDoc.data()
        }));
        
        collectionsData.push(collectionData);
      }

      res.json({
        success: true,
        data: collectionsData
      });
    } catch (error) {
      console.error('Erro ao buscar coleções da comunidade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Nova função: Obter detalhes de uma coleção pública específica
  async getPublicCollectionDetails(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const { collectionId } = req.params;
      
      const collectionDoc = await this.db.collection('collections').doc(collectionId).get();
      
      if (!collectionDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada'
        });
        return;
      }
      
      const collectionData: any = collectionDoc.data();
      
      if (!collectionData?.isPublic) {
        res.status(403).json({
          success: false,
          message: 'Coleção não é pública'
        });
        return;
      }
      
      // Buscar todos os decks da coleção com estrutura hierárquica
      const decksQuery = await this.db
        .collection('decks')
        .where('userId', '==', collectionData.userId)
        .where('collection', '==', collectionData.name)
        .orderBy('createdAt', 'desc')
        .get();
      
      const decks = [];
      
      for (const deckDoc of decksQuery.docs) {
        const deckData: any = {
          id: deckDoc.id,
          ...deckDoc.data()
        };
        
        // Buscar flashcards do deck para contagem
        const flashcardsQuery = await this.db
          .collection('flashcards')
          .where('deckId', '==', deckDoc.id)
          .get();
        
        deckData.flashcardCount = flashcardsQuery.size;
        decks.push(deckData);
      }

      res.json({
        success: true,
        data: {
          id: collectionDoc.id,
          ...collectionData,
          decks
        }
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes da coleção pública:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Nova função: Adicionar coleção pública à biblioteca pessoal
  async addCollectionToLibrary(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      const { collectionId } = req.params;
      
      // Verificar se a coleção existe e é pública
      const collectionDoc = await this.db.collection('collections').doc(collectionId).get();
      
      if (!collectionDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada'
        });
        return;
      }
      
      const collectionData: any = collectionDoc.data();
      
      if (!collectionData?.isPublic) {
        res.status(403).json({
          success: false,
          message: 'Coleção não é pública'
        });
        return;
      }
      
      // Verificar se já está na biblioteca
      const existingSubscription = await this.db
        .collection('collection_subscriptions')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .get();
      
      if (!existingSubscription.empty) {
        res.status(400).json({
          success: false,
          message: 'Coleção já está na sua biblioteca'
        });
        return;
      }
      
      // Adicionar à biblioteca
      const subscriptionData = {
        userId,
        collectionId,
        collectionName: collectionData.name,
        originalUserId: collectionData.userId,
        subscribedAt: firestore.FieldValue.serverTimestamp(),
        lastSyncedAt: firestore.FieldValue.serverTimestamp(),
        isActive: true
      };
      
      await this.db.collection('collection_subscriptions').add(subscriptionData);

      res.json({
        success: true,
        message: 'Coleção adicionada à sua biblioteca com sucesso',
        data: subscriptionData
      });
    } catch (error) {
      console.error('Erro ao adicionar coleção à biblioteca:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Nova função: Remover coleção da biblioteca pessoal
  async removeCollectionFromLibrary(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      const { collectionId } = req.params;
      
      // Buscar subscription
      const subscriptionQuery = await this.db
        .collection('collection_subscriptions')
        .where('userId', '==', userId)
        .where('collectionId', '==', collectionId)
        .limit(1)
        .get();
      
      if (subscriptionQuery.empty) {
        res.status(404).json({
          success: false,
          message: 'Coleção não está na sua biblioteca'
        });
        return;
      }
      
      // Remover subscription
      await subscriptionQuery.docs[0].ref.delete();

      res.json({
        success: true,
        message: 'Coleção removida da sua biblioteca com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover coleção da biblioteca:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Nova função: Obter biblioteca pessoal de coleções
  async getMyLibrary(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      // Buscar subscriptions do usuário
      const subscriptionsQuery = await this.db
        .collection('collection_subscriptions')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('subscribedAt', 'desc')
        .get();
      
      const libraryCollections = [];
      
      for (const subDoc of subscriptionsQuery.docs) {
        const subData = subDoc.data();
        
        // Buscar dados atualizados da coleção
        const collectionDoc = await this.db.collection('collections').doc(subData.collectionId).get();
        
        if (collectionDoc.exists && collectionDoc.data()?.isPublic) {
          const collectionData = {
            subscriptionId: subDoc.id,
            ...subData,
            ...collectionDoc.data(),
            id: collectionDoc.id
          };
          
          libraryCollections.push(collectionData);
        }
      }

      res.json({
        success: true,
        data: libraryCollections
      });
    } catch (error) {
      console.error('Erro ao buscar biblioteca pessoal:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Nova função: Tornar coleção pública/privada
  async toggleCollectionPublicStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const userId = user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      const { collectionId } = req.params;
      const { isPublic } = req.body;
      
      // Verificar se a coleção pertence ao usuário
      const collectionDoc = await this.db.collection('collections').doc(collectionId).get();
      
      if (!collectionDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Coleção não encontrada'
        });
        return;
      }
      
      const collectionData: any = collectionDoc.data();
      
      if (collectionData?.userId !== userId) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para alterar esta coleção'
        });
        return;
      }
      
      // Atualizar status público da coleção
      await collectionDoc.ref.update({
        isPublic: isPublic,
        updatedAt: firestore.FieldValue.serverTimestamp()
      });
      
      // Atualizar flag nos decks da coleção
      const decksQuery = await this.db
        .collection('decks')
        .where('userId', '==', userId)
        .where('collection', '==', collectionData.name)
        .get();
      
      const batch = this.db.batch();
      decksQuery.docs.forEach(deckDoc => {
        batch.update(deckDoc.ref, { 
          isCollectionPublic: isPublic,
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();

      res.json({
        success: true,
        message: `Coleção ${isPublic ? 'publicada' : 'despublicada'} com sucesso`
      });
    } catch (error) {
      console.error('Erro ao alterar status público da coleção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Método para obter um card específico
  async getCardById(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const user = (req as any).user;
      
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      // Primeiro, tentar buscar pelo ID do documento
      let cardDoc = await this.db.collection('flashcards').doc(cardId).get();
      
      // Se não encontrar, tentar buscar por ID interno/externo
      if (!cardDoc.exists) {
        const querySnapshot = await this.db
          .collection('flashcards')
          .where('id', '==', cardId)
          .limit(1)
          .get();
        
        if (!querySnapshot.empty) {
          cardDoc = querySnapshot.docs[0];
        }
      }
      
      if (!cardDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado'
        });
        return;
      }
      
      const cardData = cardDoc.data();
      
      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
        return;
      }
      
      // Buscar informações do deck
      const deckDoc = await this.db.collection('decks').doc(cardData?.deckId).get();
      const deckData = deckDoc.exists ? deckDoc.data() : null;
      
      const card = {
        id: cardDoc.id,
        ...cardData,
        deckName: deckData?.name || 'Deck não encontrado'
      };
      
      res.json({
        success: true,
        data: { card }
      });
      
    } catch (error) {
      console.error('Erro ao buscar card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Método para atualizar um card
  async updateCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const { front, back, tags, notes } = req.body;
      const user = (req as any).user;
      
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      // Buscar o card
      const cardDoc = await this.db.collection('flashcards').doc(cardId).get();
      
      if (!cardDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado'
        });
        return;
      }
      
      const cardData = cardDoc.data();
      
      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
        return;
      }
      
      // Preparar dados para atualização
      const updateData: any = {
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      
      if (front !== undefined) updateData.frontContent = front;
      if (back !== undefined) updateData.backContent = back;
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
      if (notes !== undefined) updateData.notes = notes;
      
      // Atualizar o card
      await this.db.collection('flashcards').doc(cardId).update(updateData);
      
      res.json({
        success: true,
        message: 'Card atualizado com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao atualizar card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Método para excluir um card
  async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardId } = req.params;
      const user = (req as any).user;
      
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }
      
      // Buscar o card
      const cardDoc = await this.db.collection('flashcards').doc(cardId).get();
      
      if (!cardDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Card não encontrado'
        });
        return;
      }
      
      const cardData = cardDoc.data();
      
      // Verificar se o card pertence ao usuário
      if (cardData?.userId !== user.id && cardData?.userId !== user.email) {
        res.status(403).json({
          success: false,
          message: 'Acesso negado'
        });
        return;
      }
      
      // Excluir o card
      await this.db.collection('flashcards').doc(cardId).delete();
      
      // Atualizar contagem do deck
      if (cardData?.deckId) {
        const deckDoc = await this.db.collection('decks').doc(cardData.deckId).get();
        if (deckDoc.exists) {
          const currentCount = deckDoc.data()?.flashcardCount || 0;
          await this.db.collection('decks').doc(cardData.deckId).update({
            flashcardCount: Math.max(0, currentCount - 1),
            updatedAt: firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Card excluído com sucesso'
      });
      
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * 🚀 SISTEMA DE BATCH DINÂMICO: Calcula lotes baseado no número real de cards
   */
  private async createDynamicBatches(deckIds: string[], user: any, isAdmin: boolean): Promise<string[][]> {
    
    const maxOperationsPerBatch = 450; // Margem de segurança do limite 500 do Firestore
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentOperations = 0;
    
    // Analisar cada deck para contar cards
    for (const deckId of deckIds) {
      try {
        // Verificar se o deck existe e pertence ao usuário
        const deckDoc = await this.db.collection('decks').doc(deckId).get();
        
        if (!deckDoc.exists) {
          continue;
        }
        
        const deckData = deckDoc.data();
        
        // Verificar permissões
        if (!isAdmin && deckData?.userId !== user.id && deckData?.userId !== user.email) {
          continue;
        }
        
        // Contar cards do deck
        const cardsSnapshot = await this.db.collection('flashcards')
          .where('deckId', '==', deckId)
          .select() // Só pegar IDs para economizar
          .get();
        
        const cardCount = cardsSnapshot.size;
        const deckOperations = cardCount + 1; // +1 para o próprio deck
        
        // Se adicionar este deck exceder o limite, fechar lote atual
        if (currentOperations + deckOperations > maxOperationsPerBatch && currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch = [];
          currentOperations = 0;
        }
        
        // Adicionar deck ao lote atual
        currentBatch.push(deckId);
        currentOperations += deckOperations;
        
        // Se um único deck excede o limite, criar lote só para ele
        if (deckOperations > maxOperationsPerBatch) {
          batches.push([deckId]);
          currentBatch = [];
          currentOperations = 0;
        }
        
      } catch (error) {
        // Continuar com próximo deck
      }
    }
    
    // Adicionar último lote se não estiver vazio
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }

  /**
   * 🚀 NOVA API: Metadados das coleções (OTIMIZADO PARA CARREGAMENTO RÁPIDO)
   */
  async getCollectionsMetadata(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Cache específico para metadados
      const cacheKey = `metadata_${user.id}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // QUERY SUPER OTIMIZADA: Apenas campos necessários
      let query: any = this.db.collection('decks');

      if (!isAdmin) {
        query = query.where('userId', 'in', [user.id, user.email]);
      }

      // Selecionar apenas campos necessários para metadados
      query = query.select('collection', 'flashcardCount', 'updatedAt', 'createdAt');

      const snapshot = await query.get();

      // Processar metadados por coleção
      const collectionsMap = new Map();

      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        const collection = data.collection || 'Sem Coleção';
        const cardCount = data.flashcardCount || 0;
        const updatedAt = data.updatedAt || data.createdAt || new Date();

        if (!collectionsMap.has(collection)) {
          collectionsMap.set(collection, {
            name: collection,
            deckCount: 0,
            cardCount: 0,
            lastUpdated: updatedAt,
            isExpanded: false
          });
        }

        const collectionData = collectionsMap.get(collection);
        collectionData.deckCount += 1;
        collectionData.cardCount += cardCount;

        // Manter a data mais recente
        if (updatedAt > collectionData.lastUpdated) {
          collectionData.lastUpdated = updatedAt;
        }
      });

      // Converter para array e ordenar por data de atualização
      const collections = Array.from(collectionsMap.values())
        .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

      const result = {
        success: true,
        data: {
          collections,
          totalCollections: collections.length,
          totalDecks: snapshot.docs.length,
          totalCards: collections.reduce((sum, col) => sum + col.cardCount, 0)
        }
      };

      // Cache por 5 minutos
      this.setCache(cacheKey, result);

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar metadados das coleções:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar metadados das coleções',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * 🚀 NOVA API: Decks de uma coleção específica (CARREGAMENTO LAZY)
   */
  async getCollectionDecks(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const collectionName = req.params.collectionName;
      if (!collectionName) {
        res.status(400).json({
          success: false,
          message: 'Nome da coleção é obrigatório'
        });
        return;
      }

      // Cache específico para coleção
      const cacheKey = `collection_${user.id}_${collectionName}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // Query para decks da coleção específica
      let query: any = this.db.collection('decks');

      if (!isAdmin) {
        query = query.where('userId', 'in', [user.id, user.email]);
      }

      query = query.where('collection', '==', decodeURIComponent(collectionName))
                   .orderBy('updatedAt', 'desc');

      const snapshot = await query.get();

      const decks = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      const result = {
        success: true,
        data: {
          collection: collectionName,
          decks,
          deckCount: decks.length,
          totalCards: decks.reduce((sum: number, deck: any) => sum + (deck.flashcardCount || 0), 0)
        }
      };

      // Cache por 2 minutos (menor TTL para dados específicos)
      const shortCacheKey = `collection_short_${user.id}_${collectionName}`;
      this.cache.set(shortCacheKey, {
        data: result,
        expiresAt: Date.now() + (2 * 60 * 1000) // 2 minutos
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar decks da coleção:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar decks da coleção',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * 🔍 NOVA API: Busca global em todas as coleções com filtros FSRS
   */
  async globalSearch(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const query = req.query.q as string;
      const filters = req.query.filters as string; // Ex: "pendentes,baixo"
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!query || query.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Query deve ter pelo menos 2 caracteres'
        });
        return;
      }

      // Cache para busca
      const cacheKey = `search_${user.id}_${query.toLowerCase()}_${filters}_${page}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // 🔍 BUSCA MELHORADA: Buscar todos os decks primeiro, depois filtrar
      let searchQuery: any = this.db.collection('decks');

      if (!isAdmin) {
        searchQuery = searchQuery.where('userId', 'in', [user.id, user.email]);
      }

      // Buscar TODOS os decks do usuário
      const allDecksSnapshot = await searchQuery.get();
      const allDecks = allDecksSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      // 🔍 BUSCA HIERÁRQUICA EM DUAS SEÇÕES
      const searchTerm = query.toLowerCase().trim();
      
      // 📋 SEÇÃO 1: RESULTADOS DIRETOS (nome, descrição)
      const directMatches = allDecks.filter((deck: any) => {
        const deckName = (deck.name || '').toLowerCase();
        const description = (deck.description || '').toLowerCase();
        
        return deckName.includes(searchTerm) || description.includes(searchTerm);
      });

      // Aplicar score aos matches diretos
      const scoredDirectMatches = directMatches.map((deck: any) => {
        const deckName = (deck.name || '').toLowerCase();
        const description = (deck.description || '').toLowerCase();
        
        let score = 0;
        if (deckName.includes(searchTerm)) {
          score += deckName.startsWith(searchTerm) ? 100 : 50;
        }
        if (description.includes(searchTerm)) {
          score += 20;
        }
        
        return { ...deck, _searchScore: score };
      });

      // Ordenar por relevância
      const sortedDirectMatches = scoredDirectMatches.sort((a: any, b: any) => b._searchScore - a._searchScore);
      
      // IDs dos decks já encontrados na seção 1 (para evitar duplicatas)
      const directMatchIds = new Set(sortedDirectMatches.map((deck: any) => deck.id));

      // 📁 SEÇÃO 2: DECKS EM PASTAS RELACIONADAS
      const folderMatches: { [key: string]: { collection: string, folder: string, decks: any[] } } = {};
      
      allDecks.forEach((deck: any) => {
        // Pular se já está nos resultados diretos
        if (directMatchIds.has(deck.id)) return;
        
        // Verificar se está em pasta relacionada
        const hierarchy = deck.hierarchy || deck.hierarchyPath?.split('::') || [deck.collection || 'Sem Coleção'];
        
        // Buscar em cada nível da hierarquia (exceto o último que é o próprio deck)
        for (let i = 0; i < hierarchy.length - 1; i++) {
          const folderName = (hierarchy[i] || '').toLowerCase();
          
          if (folderName.includes(searchTerm)) {
            const collection = hierarchy[0] || 'Sem Coleção';
            const folder = hierarchy[i];
            const key = `${collection}::${folder}`;
            
            if (!folderMatches[key]) {
              folderMatches[key] = {
                collection,
                folder,
                decks: []
              };
            }
            
            folderMatches[key].decks.push(deck);
            break; // Encontrou match, não precisa verificar outros níveis
          }
        }
      });

      // Converter folder matches para array e ordenar
      const folderResults = Object.values(folderMatches).map(group => ({
        ...group,
        deckCount: group.decks.length,
        totalCards: group.decks.reduce((sum: number, deck: any) => sum + (deck.flashcardCount || 0), 0)
      })).sort((a, b) => b.deckCount - a.deckCount); // Pastas com mais decks primeiro

      // Limpar scores dos resultados diretos
      let directResults = sortedDirectMatches.map((deck: any) => {
        const { _searchScore, ...cleanDeck } = deck;
        return cleanDeck;
      });

      // Aplicar filtros FSRS se especificados
      if (filters) {
        directResults = await this.applyFSRSFilters(directResults, filters.split(','));
        // Aplicar filtros também nos folder results
        for (const folderGroup of folderResults) {
          folderGroup.decks = await this.applyFSRSFilters(folderGroup.decks, filters.split(','));
        }
      }

      // Calcular totais para paginação
      const totalDirectResults = directResults.length;
      const totalFolderResults = folderResults.reduce((sum, group) => sum + group.deckCount, 0);
      const totalResults = totalDirectResults + totalFolderResults;

      // Paginação aplicada aos resultados diretos (folder results sempre mostram todos)
      const startIndex = (page - 1) * limit;
      const paginatedDirectResults = directResults.slice(startIndex, startIndex + limit);

      const result = {
        success: true,
        data: {
          directResults: paginatedDirectResults,
          folderResults: folderResults.slice(0, 10), // Máximo 10 pastas para performance
          query,
          filters: filters ? filters.split(',') : [],
          stats: {
            totalDirectResults,
            totalFolderResults,
            totalResults,
            folderGroupsCount: folderResults.length
          },
          pagination: {
            page,
            limit,
            total: totalDirectResults, // Paginação só para resultados diretos
            totalPages: Math.ceil(totalDirectResults / limit)
          }
        }
      };

      // Cache por 2 minutos
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + (2 * 60 * 1000)
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro na busca global:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na busca global',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * 📊 NOVA API: Status FSRS de todos os cards do usuário
   */
  async getFSRSStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      // Cache para status FSRS
      const cacheKey = `fsrs_status_${user.id}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        res.status(200).json(cachedResult);
        return;
      }

      const isAdmin = user.role === 'ADMIN' || user.role === 'admin' || user.isAdmin;

      // Buscar todos os decks do usuário
      let decksQuery: any = this.db.collection('decks');
      
      if (!isAdmin) {
        decksQuery = decksQuery.where('userId', 'in', [user.id, user.email]);
      }

      const decksSnapshot = await decksQuery.get();
      const decks = decksSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Buscar cards FSRS para cada deck
      const fsrsStats = {
        totalCards: 0,
        pendingCards: 0,
        overdueCards: 0,
        upToDateCards: 0,
        neverStudiedCards: 0,
        lowPerformance: 0,
        mediumPerformance: 0,
        highPerformance: 0,
        deckStats: [] as any[]
      };

      const now = new Date();
      
      for (const deck of decks) {
        try {
          // Buscar cards FSRS deste deck
          const cardsSnapshot = await this.db
            .collection('fsrs_cards')
            .where('deck_id', '==', deck.id)
            .get();

          const deckStat = {
            deckId: deck.id,
            deckName: deck.name,
            collection: deck.collection,
            totalCards: cardsSnapshot.docs.length,
            pendingCards: 0,
            overdueCards: 0,
            upToDateCards: 0,
            neverStudiedCards: 0,
            lowPerformance: 0,
            mediumPerformance: 0,
            highPerformance: 0,
            lastReview: null as any
          };

          cardsSnapshot.docs.forEach((cardDoc: any) => {
            const cardData = cardDoc.data();
            fsrsStats.totalCards++;
            deckStat.totalCards++;

            // Analisar status do card
            const nextReview = cardData.next_review?.toDate();
            const lastReview = cardData.last_review?.toDate();
            const difficulty = cardData.difficulty || 0;
            const stability = cardData.stability || 0;

            // Última revisão do deck
            if (lastReview && (!deckStat.lastReview || lastReview > deckStat.lastReview)) {
              deckStat.lastReview = lastReview;
            }

            // Status de revisão
            if (!nextReview) {
              // Nunca estudado
              fsrsStats.neverStudiedCards++;
              deckStat.neverStudiedCards++;
            } else if (nextReview <= now) {
              // Pendente
              fsrsStats.pendingCards++;
              deckStat.pendingCards++;
              
              // Vencida (mais de 7 dias)
              const daysDiff = Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff > 7) {
                fsrsStats.overdueCards++;
                deckStat.overdueCards++;
              }
            } else {
              // Em dia
              fsrsStats.upToDateCards++;
              deckStat.upToDateCards++;
            }

            // Análise de desempenho
            if (difficulty > 8 || stability < 1) {
              fsrsStats.lowPerformance++;
              deckStat.lowPerformance++;
            } else if (difficulty >= 5 && difficulty <= 8 && stability >= 1 && stability <= 7) {
              fsrsStats.mediumPerformance++;
              deckStat.mediumPerformance++;
            } else if (difficulty < 5 && stability > 7) {
              fsrsStats.highPerformance++;
              deckStat.highPerformance++;
            }
          });

          fsrsStats.deckStats.push(deckStat);
        } catch (error) {
          console.error(`Erro ao analisar deck ${deck.id}:`, error);
        }
      }

      const result = {
        success: true,
        data: fsrsStats
      };

      // Cache por 5 minutos
      this.cache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + (5 * 60 * 1000)
      });

      res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao buscar status FSRS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao buscar status FSRS',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * 🎛️ MÉTODO AUXILIAR: Aplicar filtros FSRS
   */
  private async applyFSRSFilters(decks: any[], filters: string[]): Promise<any[]> {
    if (!filters || filters.length === 0) return decks;

    const filteredDecks = [];
    const now = new Date();

    for (const deck of decks) {
      try {
        // Buscar cards FSRS deste deck
        const cardsSnapshot = await this.db
          .collection('fsrs_cards')
          .where('deck_id', '==', deck.id)
          .get();

        let matchesFilter = false;
        let deckStats = {
          pendingCards: 0,
          overdueCards: 0,
          upToDateCards: 0,
          neverStudiedCards: 0,
          lowPerformance: 0,
          mediumPerformance: 0,
          highPerformance: 0
        };

        // Analisar cards para aplicar filtros
        cardsSnapshot.docs.forEach((cardDoc: any) => {
          const cardData = cardDoc.data();
          const nextReview = cardData.next_review?.toDate();
          const difficulty = cardData.difficulty || 0;
          const stability = cardData.stability || 0;

          // Contadores para filtros
          if (!nextReview) {
            deckStats.neverStudiedCards++;
          } else if (nextReview <= now) {
            deckStats.pendingCards++;
            const daysDiff = Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 7) {
              deckStats.overdueCards++;
            }
          } else {
            deckStats.upToDateCards++;
          }

          // Análise de desempenho
          if (difficulty > 8 || stability < 1) {
            deckStats.lowPerformance++;
          } else if (difficulty >= 5 && difficulty <= 8 && stability >= 1 && stability <= 7) {
            deckStats.mediumPerformance++;
          } else if (difficulty < 5 && stability > 7) {
            deckStats.highPerformance++;
          }
        });

        // Verificar se deck atende aos filtros
        for (const filter of filters) {
          switch (filter.toLowerCase()) {
            case 'pendentes':
              if (deckStats.pendingCards > 0) matchesFilter = true;
              break;
            case 'vencidas':
              if (deckStats.overdueCards > 0) matchesFilter = true;
              break;
            case 'em-dia':
              if (deckStats.upToDateCards > 0) matchesFilter = true;
              break;
            case 'nunca-estudadas':
              if (deckStats.neverStudiedCards > 0) matchesFilter = true;
              break;
            case 'baixo':
              if (deckStats.lowPerformance > 0) matchesFilter = true;
              break;
            case 'medio':
              if (deckStats.mediumPerformance > 0) matchesFilter = true;
              break;
            case 'alto':
              if (deckStats.highPerformance > 0) matchesFilter = true;
              break;
            case 'alta-prioridade':
              if (deckStats.overdueCards > 0 && deckStats.lowPerformance > 0) matchesFilter = true;
              break;
          }
        }

        if (matchesFilter) {
          // Adicionar estatísticas ao deck
          deck.fsrsStats = deckStats;
          filteredDecks.push(deck);
        }
      } catch (error) {
        console.error(`Erro ao filtrar deck ${deck.id}:`, error);
      }
    }

    return filteredDecks;
  }
} 