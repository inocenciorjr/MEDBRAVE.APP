import { Response } from 'express';
import { AuthenticatedRequest } from '../../../auth/middleware/supabaseAuth.middleware';
import { supabase } from '../../../../config/supabase';

export class CollectionController {
  /**
   * Tornar todos os decks de uma coleção públicos ou privados
   */
  async updateCollectionPublicStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params; // Na verdade é o collectionId (UUID)
      const { isPublic } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      if (typeof isPublic !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isPublic deve ser boolean' });
      }



      // Atualizar a coleção na tabela collections
      const { error: collectionError } = await supabase
        .from('collections')
        .update({ is_public: isPublic })
        .eq('id', collectionName)
        .eq('user_id', userId);

      if (collectionError) {
        console.error('Erro ao atualizar status público da coleção:', collectionError);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar coleção' });
      }

      // Atualizar todos os decks da coleção usando collection_id (UUID)
      const { data, error } = await supabase
        .from('decks')
        .update({
          is_public: isPublic
          // NÃO atualizar updated_at - isso deve refletir apenas mudanças no conteúdo
        })
        .eq('user_id', userId)
        .eq('collection_id', collectionName) // ✅ Usar collection_id ao invés de collection
        .select('id, name');

      if (error) {
        console.error('Erro ao atualizar status público dos decks:', error);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar decks' });
      }



      return res.status(200).json({
        success: true,
        message: `Coleção ${isPublic ? 'publicada' : 'tornada privada'} com sucesso`,
        data: {
          collectionId: collectionName,
          isPublic,
          decksUpdated: data?.length || 0
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar status público da coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Listar coleções públicas da comunidade - OTIMIZADO
   */
  async getPublicCollections(req: AuthenticatedRequest, res: Response) {
    try {
      console.time('⏱️ [Backend] getPublicCollections - TOTAL');

      const userId = req.user?.id;
      const { page = '1', limit = '20' } = req.query;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      console.log('🔍 [Backend] getPublicCollections - userId:', userId);
      console.time('⏱️ [Backend] getPublicCollections - Query SQL');

      // OTIMIZADO: Query SQL direta que agrupa e filtra em uma única operação
      const { data: collections, error } = await supabase.rpc('get_public_collections', {
        p_user_id: userId
      });

      console.timeEnd('⏱️ [Backend] getPublicCollections - Query SQL');
      console.log('📊 [Backend] getPublicCollections - Coleções encontradas:', collections?.length || 0);

      if (error) {
        console.error('Erro ao buscar coleções públicas:', error);

        // Fallback para método antigo se a função não existir
        if (error.message?.includes('function') || error.code === '42883') {
          console.warn('⚠️ Função get_public_collections não existe, usando método alternativo');
          return this.getPublicCollectionsLegacy(req, res);
        }

        return res.status(500).json({ success: false, message: 'Erro ao buscar coleções' });
      }

      // Paginação
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedCollections = collections.slice(startIndex, endIndex);

      console.timeEnd('⏱️ [Backend] getPublicCollections - TOTAL');

      return res.status(200).json({
        success: true,
        data: paginatedCollections,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: collections.length,
          totalPages: Math.ceil(collections.length / limitNum)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar coleções públicas:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Método legacy (fallback) - LENTO mas funciona sem função SQL
   */
  async getPublicCollectionsLegacy(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { page = '1', limit = '20' } = req.query;

      // Buscar apenas decks públicos de outros usuários
      const { data: decks, error } = await supabase
        .from('decks')
        .select('collection_id, user_id, flashcard_count, updated_at, cover_image_url')
        .eq('is_public', true)
        .neq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar decks públicos:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar coleções' });
      }

      // Agrupar por coleção
      const collectionsMap = new Map();

      decks?.forEach((deck: any) => {
        const { collection_id, user_id, flashcard_count, updated_at, cover_image_url } = deck;

        if (!collection_id) return;

        if (!collectionsMap.has(collection_id)) {
          collectionsMap.set(collection_id, {
            name: collection_id,
            user_id: user_id,
            deck_count: 0,
            card_count: 0,
            updated_at: updated_at,
            cover_image_url: cover_image_url || null
          });
        }

        const collectionData = collectionsMap.get(collection_id);
        collectionData.deck_count += 1;
        collectionData.card_count += flashcard_count || 0;

        if (updated_at && updated_at > collectionData.updated_at) {
          collectionData.updated_at = updated_at;
        }

        if (cover_image_url && !collectionData.cover_image_url) {
          collectionData.cover_image_url = cover_image_url;
        }
      });

      const collections = Array.from(collectionsMap.values())
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      // Buscar informações dos autores, likes e imports em paralelo
      const collectionsWithDetails = await Promise.all(
        collections.map(async (collection) => {
          const [authorData, likesResult, importsResult] = await Promise.all([
            supabase.from('users').select('name, avatar_url').eq('id', collection.user_id).single(),
            supabase.from('collection_likes').select('*', { count: 'exact', head: true }).eq('collection_id', collection.id),
            supabase.from('collection_imports').select('*', { count: 'exact', head: true }).eq('collection_id', collection.id)
          ]);

          return {
            ...collection,
            author_name: authorData.data?.name || 'Usuário',
            author_avatar: authorData.data?.avatar_url || null,
            likes: likesResult.count || 0,
            imports: importsResult.count || 0,
            is_hot: false,
            thumbnail_url: collection.cover_image_url
          };
        })
      );

      // Paginação
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedCollections = collectionsWithDetails.slice(startIndex, endIndex);

      return res.status(200).json({
        success: true,
        data: paginatedCollections,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: collectionsWithDetails.length,
          totalPages: Math.ceil(collectionsWithDetails.length / limitNum)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar coleções públicas (legacy):', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Obter detalhes de uma coleção pública específica
   */
  async getPublicCollectionDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params; // Na verdade é collectionId (UUID)
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Primeiro buscar a coleção para obter o nome
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('id, name, user_id, created_at, updated_at, is_public')
        .eq('id', collectionName)
        .eq('is_public', true)
        .single();

      if (collectionError || !collection) {
        return res.status(404).json({ success: false, message: 'Coleção não encontrada ou não é pública' });
      }

      // Buscar todos os decks da coleção pública
      const { data: decks, error } = await supabase
        .from('decks')
        .select('id, name, description, hierarchy, flashcard_count, cover_image_url, user_id, created_at, updated_at')
        .eq('collection_id', collectionName)
        .eq('is_public', true);

      if (error) {
        console.error('Erro ao buscar detalhes da coleção:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar coleção' });
      }

      const totalCards = decks?.reduce((sum, deck) => sum + (deck.flashcard_count || 0), 0) || 0;

      // Buscar informações do autor
      const { data: authorData } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', collection.user_id)
        .single();

      // Buscar estatísticas (likes e imports)
      const { count: likesCount } = await supabase
        .from('collection_likes')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collection.id);

      const { count: importsCount } = await supabase
        .from('collection_imports')
        .select('*', { count: 'exact', head: true })
        .eq('collection_id', collection.id);

      // Buscar thumbnail da coleção (usar a primeira imagem de capa encontrada)
      const thumbnailUrl = decks?.find(d => d.cover_image_url)?.cover_image_url || null;

      return res.status(200).json({
        success: true,
        data: {
          id: collection.id,
          name: collection.name,
          user_id: collection.user_id,
          author_name: authorData?.name || 'Usuário',
          author_avatar: authorData?.avatar_url || null,
          thumbnail_url: thumbnailUrl,
          deck_count: decks?.length || 0,
          card_count: totalCards,
          likes: likesCount || 0,
          imports: importsCount || 0,
          is_hot: false, // TODO: implementar lógica de "em alta"
          created_at: collection.created_at,
          updated_at: collection.updated_at,
          decks: decks || []
        }
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes da coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Clonar uma coleção pública inteira para a biblioteca do usuário
   */
  async clonePublicCollection(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Buscar todos os decks da coleção pública
      const { data: sourceDecks, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .eq('collection_id', collectionName)
        .eq('is_public', true);

      if (decksError || !sourceDecks || sourceDecks.length === 0) {
        console.error('Erro ao buscar decks da coleção:', decksError);
        return res.status(404).json({ success: false, message: 'Coleção não encontrada ou não é pública' });
      }

      // Buscar todos os flashcards dos decks
      const sourceDeckIds = sourceDecks.map(d => d.id);
      const { data: sourceCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .in('deck_id', sourceDeckIds);

      if (cardsError) {
        console.error('Erro ao buscar flashcards:', cardsError);
        return res.status(500).json({ success: false, message: 'Erro ao buscar flashcards' });
      }

      // Importar função de geração de IDs
      const { generateDeckId, generateFlashcardId } = require('../../../../../dist/src/utils/idGenerator.js');

      // Clonar decks
      const clonedDecks = [];
      const deckIdMap = new Map(); // Mapear IDs antigos para novos

      for (const sourceDeck of sourceDecks) {
        const newDeckId = await generateDeckId(userId, sourceDeck.name, collectionName);

        const clonedDeck = {
          id: newDeckId,
          user_id: userId,
          name: sourceDeck.name,
          description: sourceDeck.description,
          collection_id: collectionName,
          hierarchy: sourceDeck.hierarchy,
          hierarchy_path: sourceDeck.hierarchy_path,
          path: sourceDeck.path,
          flashcard_count: sourceDeck.flashcard_count,
          is_public: false, // Coleção clonada é privada por padrão
          is_imported: false, // ❌ NÃO marcar como importado - isso é só para .apkg
          cover_image_url: sourceDeck.cover_image_url,
          tags: sourceDeck.tags,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        clonedDecks.push(clonedDeck);
        deckIdMap.set(sourceDeck.id, newDeckId);
      }

      // Inserir decks clonados
      const { error: insertDecksError } = await supabase
        .from('decks')
        .insert(clonedDecks);

      if (insertDecksError) {
        console.error('Erro ao inserir decks clonados:', insertDecksError);
        return res.status(500).json({ success: false, message: 'Erro ao clonar decks' });
      }

      // Clonar flashcards
      const clonedCards: any[] = [];
      for (const sourceCard of sourceCards || []) {
        const newDeckId = deckIdMap.get(sourceCard.deck_id);
        if (!newDeckId) continue;

        const newCardId: string = await generateFlashcardId(userId, newDeckId, clonedCards.length, {});

        const clonedCard: any = {
          id: newCardId,
          deck_id: newDeckId,
          user_id: userId,
          front: sourceCard.front,
          back: sourceCard.back,
          tags: sourceCard.tags,
          difficulty: sourceCard.difficulty,
          stability: sourceCard.stability,
          due_date: new Date().toISOString(), // Resetar data de revisão
          last_review: null,
          review_count: 0,
          state: 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        clonedCards.push(clonedCard);
      }

      // Inserir flashcards clonados em lotes
      if (clonedCards.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < clonedCards.length; i += batchSize) {
          const batch = clonedCards.slice(i, i + batchSize);
          const { error: insertCardsError } = await supabase
            .from('flashcards')
            .insert(batch);

          if (insertCardsError) {
            console.error('Erro ao inserir flashcards clonados:', insertCardsError);
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Coleção clonada com sucesso',
        data: {
          collectionName,
          decksCloned: clonedDecks.length,
          cardsCloned: clonedCards.length
        }
      });
    } catch (error) {
      console.error('Erro ao clonar coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Curtir/Descurtir uma coleção
   */
  async toggleCollectionLike(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params; // Na verdade é collectionId (UUID)
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Verificar se já curtiu
      const { data: existingLike } = await supabase
        .from('collection_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName)
        .single();

      if (existingLike) {
        // Remover curtida
        const { error } = await supabase
          .from('collection_likes')
          .delete()
          .eq('user_id', userId)
          .eq('collection_id', collectionName);

        if (error) {
          console.error('Erro ao remover curtida:', error);
          return res.status(500).json({ success: false, message: 'Erro ao remover curtida' });
        }

        return res.status(200).json({
          success: true,
          liked: false,
          message: 'Curtida removida'
        });
      } else {
        // Adicionar curtida
        const { error } = await supabase
          .from('collection_likes')
          .insert({
            user_id: userId,
            collection_id: collectionName
          });

        if (error) {
          console.error('Erro ao adicionar curtida:', error);
          return res.status(500).json({ success: false, message: 'Erro ao adicionar curtida' });
        }

        return res.status(200).json({
          success: true,
          liked: true,
          message: 'Coleção curtida'
        });
      }
    } catch (error) {
      console.error('Erro ao curtir/descurtir coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Obter todas as coleções importadas pelo usuário (apenas nomes)
   */
  async getImportedCollectionNames(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Buscar todas as coleções importadas
      const { data: imports, error } = await supabase
        .from('collection_imports')
        .select('collection_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar coleções importadas:', error);
        return res.status(500).json({ success: false, message: 'Erro ao buscar coleções' });
      }

      const collectionIds = imports?.map(i => i.collection_id) || [];

      return res.status(200).json({
        success: true,
        data: collectionIds
      });
    } catch (error) {
      console.error('Erro ao buscar coleções importadas:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Importar uma coleção (registrar o import)
   */
  async importCollection(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params; // Na verdade é collectionId (UUID)
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Verificar se já importou
      const { data: existingImport } = await supabase
        .from('collection_imports')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName)
        .single();

      if (!existingImport) {
        // Registrar import
        const { error } = await supabase
          .from('collection_imports')
          .insert({
            user_id: userId,
            collection_id: collectionName
          });

        if (error) {
          console.error('Erro ao registrar import:', error);
          return res.status(500).json({ success: false, message: 'Erro ao registrar import' });
        }
      }

      return res.status(200).json({
        success: true,
        imported: true,
        message: 'Import registrado'
      });
    } catch (error) {
      console.error('Erro ao importar coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Verificar se usuário curtiu uma coleção
   */
  async checkCollectionLiked(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // collectionName na verdade é o collectionId (UUID)
      const { data } = await supabase
        .from('collection_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName)
        .single();

      return res.status(200).json({
        success: true,
        liked: !!data
      });
    } catch (error) {
      console.error('Erro ao verificar like:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Verificar se usuário importou uma coleção
   */
  async checkCollectionImported(req: AuthenticatedRequest, res: Response) {
    try {
      const { collectionName } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // collectionName na verdade é o collectionId (UUID)
      const { data } = await supabase
        .from('collection_imports')
        .select('id')
        .eq('user_id', userId)
        .eq('collection_id', collectionName)
        .single();

      return res.status(200).json({
        success: true,
        imported: !!data
      });
    } catch (error) {
      console.error('Erro ao verificar import:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Atualizar informações de uma coleção (nome e thumbnail)
   */
  async updateCollection(req: AuthenticatedRequest, res: Response) {
    try {

      const userId = req.user?.id;

      if (!userId) {

        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const { collectionId, collectionName } = req.body;
      const coverImageFile = (req as any).file; // Multer adiciona o arquivo aqui



      if (!collectionId) {

        return res.status(400).json({ success: false, message: 'collectionId é obrigatório' });
      }

      // Buscar a coleção para verificar se pertence ao usuário e se foi importada
      const { data: collection, error: fetchError } = await supabase
        .from('collections')
        .select('id, name, user_id, is_imported, thumbnail_url, image_url')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !collection) {
        return res.status(404).json({ success: false, message: 'Coleção não encontrada' });
      }

      const isImported = collection.is_imported || false;
      const currentImageUrl = collection.thumbnail_url || collection.image_url;
      const updates: any = {};

      // Atualizar nome da coleção (apenas se não for importada)
      if (collectionName && collectionName !== collection.name) {
        if (isImported) {
          return res.status(400).json({
            success: false,
            message: 'Não é permitido alterar o nome de coleções importadas via .apkg'
          });
        }
        updates.name = collectionName;
      }

      // Processar upload de thumbnail para R2
      let newImageUrl = currentImageUrl;
      if (coverImageFile) {
        try {
          const fs = require('fs');
          const { R2Service } = await import('../../../../services/r2Service');
          const r2Service = new R2Service();

          // Criar slug da coleção (mesma lógica do processador)
          const collectionSlug = collectionId
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 50);

          // Upload da nova imagem para R2 usando a estrutura: flashcards/{userId}/{collectionSlug}/
          const imageBuffer = fs.readFileSync(coverImageFile.path);
          const timestamp = Date.now();
          const fileName = `cover-${timestamp}.jpg`;
          const folder = `flashcards/${userId}/${collectionSlug}`;

          const uploadResult = await r2Service.uploadFile(
            imageBuffer,
            fileName,
            coverImageFile.mimetype,
            folder
          );

          if (uploadResult.publicUrl) {
            newImageUrl = uploadResult.publicUrl;
            updates.image_url = newImageUrl;
            console.log(`✅ Nova thumbnail enviada para R2: ${newImageUrl}`);

            // Remover imagem antiga do R2 se existir (exceto thumbnail padrão)
            if (currentImageUrl && currentImageUrl.includes('medbrave.com.br') && !currentImageUrl.includes('/medbravethumb.png')) {
              try {
                const oldKey = currentImageUrl.split('medbrave.com.br/')[1];
                if (oldKey) {
                  await r2Service.deleteFile(oldKey);
                  console.log(`✅ Thumbnail antiga removida do R2: ${oldKey}`);
                }
              } catch (deleteError) {
                console.error('⚠️ Erro ao remover thumbnail antiga:', deleteError);
                // Continuar mesmo se falhar ao remover a antiga
              }
            }
          }

          // Limpar arquivo temporário
          fs.unlinkSync(coverImageFile.path);
        } catch (imageError) {
          console.error('❌ Erro ao fazer upload da thumbnail:', imageError);
          return res.status(500).json({ success: false, message: 'Erro ao fazer upload da imagem' });
        }
      }

      // Se houver atualizações, aplicar na tabela collections
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('collections')
          .update(updates)
          .eq('id', collectionId)
          .eq('user_id', userId);

        if (updateError) {
          console.error('Erro ao atualizar coleção:', updateError);
          return res.status(500).json({ success: false, message: 'Erro ao atualizar coleção' });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Coleção atualizada com sucesso',
        data: {
          id: collectionId,
          name: collectionName || collection.name,
          thumbnail_url: newImageUrl
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar coleção:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Remover thumbnail de uma coleção
   */
  async removeThumbnail(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🗑️ [removeThumbnail] ========== INÍCIO ==========');
      console.log('🗑️ [removeThumbnail] Método HTTP:', req.method);
      console.log('🗑️ [removeThumbnail] URL:', req.url);
      console.log('🗑️ [removeThumbnail] Headers:', JSON.stringify(req.headers, null, 2));
      console.log('🗑️ [removeThumbnail] Body:', JSON.stringify(req.body, null, 2));
      
      const userId = req.user?.id;
      console.log('🗑️ [removeThumbnail] User ID:', userId);
      console.log('🗑️ [removeThumbnail] User completo:', JSON.stringify(req.user, null, 2));

      if (!userId) {
        console.log('❌ [removeThumbnail] Usuário não autenticado');
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const { collectionId } = req.body;
      console.log('🗑️ [removeThumbnail] collectionId recebido:', collectionId);
      console.log('🗑️ [removeThumbnail] Tipo do collectionId:', typeof collectionId);

      if (!collectionId) {
        console.log('❌ [removeThumbnail] collectionId não fornecido');
        return res.status(400).json({ success: false, message: 'collectionId é obrigatório' });
      }

      // Buscar a coleção para verificar se pertence ao usuário e obter thumbnail_url e image_url
      console.log('🔍 [removeThumbnail] Iniciando busca da coleção no Supabase...');
      console.log('🔍 [removeThumbnail] Query: SELECT id, user_id, thumbnail_url, image_url FROM collections WHERE id =', collectionId, 'AND user_id =', userId);
      
      const { data: collection, error: fetchError } = await supabase
        .from('collections')
        .select('id, user_id, thumbnail_url, image_url')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      console.log('🔍 [removeThumbnail] Resultado da busca:');
      console.log('🔍 [removeThumbnail] - Data:', JSON.stringify(collection, null, 2));
      console.log('🔍 [removeThumbnail] - Error:', JSON.stringify(fetchError, null, 2));

      if (fetchError) {
        console.error('❌ [removeThumbnail] Erro ao buscar coleção:', fetchError);
        console.error('❌ [removeThumbnail] Código do erro:', fetchError.code);
        console.error('❌ [removeThumbnail] Mensagem do erro:', fetchError.message);
        console.error('❌ [removeThumbnail] Detalhes do erro:', fetchError.details);
        console.error('❌ [removeThumbnail] Hint do erro:', fetchError.hint);
        return res.status(500).json({ success: false, message: 'Erro ao buscar coleção', error: fetchError.message });
      }

      if (!collection) {
        console.log('❌ [removeThumbnail] Coleção não encontrada (data é null)');
        return res.status(404).json({ success: false, message: 'Coleção não encontrada' });
      }

      console.log('✅ [removeThumbnail] Coleção encontrada com sucesso!');
      console.log('✅ [removeThumbnail] Dados da coleção:', JSON.stringify(collection, null, 2));

      const thumbnailUrl = collection.thumbnail_url;
      const imageUrl = collection.image_url;
      console.log('🖼️ [removeThumbnail] Thumbnail URL atual:', thumbnailUrl);
      console.log('🖼️ [removeThumbnail] Image URL atual:', imageUrl);

      // Remover thumbnail_url do R2 se existir (exceto thumbnail padrão)
      if (thumbnailUrl && thumbnailUrl.includes('medbrave.com.br') && !thumbnailUrl.includes('/medbravethumb.png')) {
        console.log('🗑️ [removeThumbnail] Iniciando remoção do thumbnail_url do R2...');
        try {
          const { R2Service } = await import('../../../../services/r2Service');
          const r2Service = new R2Service();

          const imageKey = thumbnailUrl.split('medbrave.com.br/')[1];
          console.log('🗑️ [removeThumbnail] Thumbnail key:', imageKey);
          
          if (imageKey) {
            await r2Service.deleteFile(imageKey);
            console.log(`✅ [removeThumbnail] Thumbnail removida do R2: ${imageKey}`);
          }
        } catch (deleteError) {
          console.error('⚠️ [removeThumbnail] Erro ao remover thumbnail do R2:', deleteError);
          // Continuar mesmo se falhar ao remover do R2
        }
      }

      // Remover image_url do R2 se existir (exceto thumbnail padrão)
      if (imageUrl && imageUrl.includes('medbrave.com.br') && !imageUrl.includes('/medbravethumb.png')) {
        console.log('🗑️ [removeThumbnail] Iniciando remoção do image_url do R2...');
        try {
          const { R2Service } = await import('../../../../services/r2Service');
          const r2Service = new R2Service();

          const imageKey = imageUrl.split('medbrave.com.br/')[1];
          console.log('🗑️ [removeThumbnail] Image key:', imageKey);
          
          if (imageKey) {
            await r2Service.deleteFile(imageKey);
            console.log(`✅ [removeThumbnail] Image removida do R2: ${imageKey}`);
          }
        } catch (deleteError) {
          console.error('⚠️ [removeThumbnail] Erro ao remover image do R2:', deleteError);
          // Continuar mesmo se falhar ao remover do R2
        }
      }

      if (!thumbnailUrl && !imageUrl) {
        console.log('ℹ️ [removeThumbnail] Não há imagens para remover do R2');
      }

      // Atualizar banco de dados - remover thumbnail da coleção (tanto thumbnail_url quanto image_url)
      console.log('💾 [removeThumbnail] Iniciando atualização no banco de dados...');
      console.log('💾 [removeThumbnail] Query: UPDATE collections SET thumbnail_url = null, image_url = null WHERE id =', collectionId, 'AND user_id =', userId);
      
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          thumbnail_url: null,
          image_url: null 
        })
        .eq('id', collectionId)
        .eq('user_id', userId);

      console.log('💾 [removeThumbnail] Resultado da atualização:');
      console.log('💾 [removeThumbnail] - Error:', JSON.stringify(updateError, null, 2));

      if (updateError) {
        console.error('❌ [removeThumbnail] Erro ao atualizar coleção:', updateError);
        console.error('❌ [removeThumbnail] Código do erro:', updateError.code);
        console.error('❌ [removeThumbnail] Mensagem do erro:', updateError.message);
        return res.status(500).json({ success: false, message: 'Erro ao remover thumbnail' });
      }

      console.log('✅ [removeThumbnail] Thumbnail removida com sucesso!');
      console.log('🗑️ [removeThumbnail] ========== FIM ==========');
      
      return res.status(200).json({
        success: true,
        message: 'Thumbnail removida com sucesso'
      });
    } catch (error) {
      console.error('❌ [removeThumbnail] ERRO CRÍTICO:', error);
      console.error('❌ [removeThumbnail] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      console.error('🗑️ [removeThumbnail] ========== FIM COM ERRO ==========');
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Buscar metadados das coleções do usuário
   */
  async getCollectionsMetadata(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      console.log('🔍 [getCollectionsMetadata] Buscando coleções do usuário:', userId);

      // Buscar todas as coleções do usuário
      const { data: collections, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar metadados das coleções:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro ao buscar metadados das coleções',
          error: error.message
        });
      }

      console.log('📦 [getCollectionsMetadata] Coleções encontradas:', collections?.length || 0);

      // Mapear para o formato esperado pelo frontend
      const mappedCollections = collections?.map(c => ({
        id: c.id,
        name: c.name,
        deckCount: c.deck_count || 0,
        cardCount: c.card_count || 0,
        updatedAt: c.updated_at,
        is_official: c.is_official || false,
        is_public: c.is_public || false,
        thumbnail_url: c.thumbnail_url
      })) || [];

      return res.status(200).json({
        success: true,
        data: mappedCollections
      });
    } catch (error: any) {
      console.error('Erro ao buscar metadados das coleções:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error.message
      });
    }
  }

  /**
   * Listar coleções da comunidade (oficiais e não-oficiais)
   */
  async getCommunityCollections(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🚀🚀🚀 NOVO CÓDIGO EXECUTANDO! 🚀🚀🚀');
      
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      // Usar query SQL direta para garantir que retorna TODAS as coleções públicas
      const { data: collections, error } = await supabase
        .rpc('get_public_collections');

      if (error) {
        console.error('❌ Erro RPC:', error);
        // Fallback para query normal
        const { data: fallbackCollections, error: fallbackError } = await supabase
          .from('collections')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          return res.status(500).json({ success: false, message: 'Erro ao buscar coleções' });
        }
        
        console.log('✅ Fallback retornou:', fallbackCollections?.length, 'coleções');
        return res.status(200).json({ success: true, data: fallbackCollections || [] });
      }

      console.log('✅ RPC retornou:', collections?.length, 'coleções');
      return res.status(200).json({ success: true, data: collections || [] });
    } catch (error: any) {
      console.error('❌ Erro crítico:', error);
      return res.status(500).json({ success: false, message: 'Erro interno' });
    }
  }
}
