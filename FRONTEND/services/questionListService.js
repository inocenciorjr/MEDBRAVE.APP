import { supabase } from '../config/supabase';
import { supabaseAuthService } from '@/lib/services/supabaseAuthService';

// Cache para otimização
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
const foldersCache = new Map();
const listsCache = new Map();

// Função para obter usuário atual autenticado
const getCurrentUser = () => {
  const user = supabaseAuthService.getUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  return user;
};

// Função para gerar chave de cache
const generateCacheKey = (params) => {
  return `${JSON.stringify(params)}_${Math.floor(Date.now() / CACHE_TTL)}`;
};

// Função para verificar se cache é válido
const isCacheValid = (cacheEntry) => {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
};

// ===== SERVIÇOS DE PASTAS =====

/**
 * Buscar todas as pastas do usuário
 */
export const getUserFolders = async () => {
  const user = getCurrentUser();
  const cacheKey = generateCacheKey({ user_id: user.uid, type: 'folders' });
  const cached = foldersCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const { data, error } = await supabase
      .from('questionListFolders')
      .select('*')
      .eq('user_id', user.uid)
      .eq('status', 'ACTIVE')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const folders = data || [];

    // Cache do resultado
    foldersCache.set(cacheKey, {
      data: folders,
      timestamp: Date.now()
    });

    return folders;
  } catch (error) {
    console.error('Erro ao buscar pastas:', error);
    throw error;
  }
};

/**
 * Criar nova pasta
 */
export const createFolder = async (folderData) => {
  const user = getCurrentUser();
  
  try {
    const { data, error } = await supabase
      .from('questionListFolders')
      .insert({
        ...folderData,
        user_id: user.uid,
        listCount: 0,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Limpar cache
    foldersCache.clear();
    
    return data.id;
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    throw error;
  }
};

/**
 * Atualizar pasta
 */
export const updateFolder = async (folder_id, updateData) => {
  try {
    const { error } = await supabase
      .from('questionListFolders')
      .update({
        ...updateData,
      updated_at: new Date().toISOString()
      })
      .eq('id', folder_id);

    if (error) throw error;

    // Limpar cache
    foldersCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar pasta:', error);
    throw error;
  }
};

/**
 * Deletar pasta (soft delete)
 */
export const deleteFolder = async (folder_id) => {
  try {
    const { error } = await supabase
      .from('questionListFolders')
      .update({
        status: 'DELETED',
        updated_at: new Date().toISOString()
      })
      .eq('id', folder_id);

    if (error) throw error;

    // Limpar cache
    foldersCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar pasta:', error);
    throw error;
  }
};

/**
 * Reordenar pastas
 */
export const reorderFolders = async (folderUpdates) => {
  try {
    // Supabase não tem batch nativo, então fazemos updates individuais
    const updatePromises = folderUpdates.map(({ id, order }) => 
      supabase
        .from('questionListFolders')
        .update({ 
          order,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    );
    
    const results = await Promise.all(updatePromises);
    
    // Verificar se algum update falhou
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Falha ao atualizar ${errors.length} pastas`);
    }
    
    // Limpar cache
    foldersCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao reordenar pastas:', error);
    throw error;
  }
};

// ===== SERVIÇOS DE LISTAS =====

/**
 * Buscar listas do usuário (com filtro opcional por pasta)
 */
export const getUserQuestionLists = async (folder_id = null) => {
  const user = getCurrentUser();
  const cacheKey = generateCacheKey({ user_id: user.uid, folder_id, type: 'lists' });
  const cached = listsCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    let query = supabase
      .from('questionLists')
      .select('*')
      .eq('user_id', user.uid)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });
    
    if (folder_id === null) {
      // Buscar listas sem pasta
      query = query.is('folder_id', null);
    } else {
      // Buscar listas de uma pasta específica
      query = query.eq('folder_id', folder_id);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const lists = data || [];

    // Cache do resultado
    listsCache.set(cacheKey, {
      data: lists,
      timestamp: Date.now()
    });

    return lists;
  } catch (error) {
    console.error('Erro ao buscar listas:', error);
    throw error;
  }
};

/**
 * Criar nova lista de questões
 */
export const createQuestionList = async (listData) => {
  const user = getCurrentUser();
  
  try {
    const { data, error } = await supabase
      .from('questionLists')
      .insert({
        name: listData.name || '',
        description: listData.description || '',
        folder_id: listData.folder_id || null,
        isPublic: listData.isPublic || false,
        tags: listData.tags || [],
        user_id: user.uid,
        questionCount: 0,
        status: 'ACTIVE',
        viewCount: 0,
        favoriteCount: 0,
        completionPercentage: 0,
        lastStudyDate: null,
        lastAddedAt: null,
        created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Se a lista foi criada em uma pasta, atualizar contador da pasta
    if (listData.folder_id) {
      await updateFolderListCount(listData.folder_id, 1);
    }

    // Limpar cache
    listsCache.clear();
    
    return data.id;
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    throw error;
  }
};

/**
 * Atualizar lista de questões
 */
export const updateQuestionList = async (listId, updateData) => {
  try {
    // Buscar dados antigos primeiro
    const { data: oldData, error: fetchError } = await supabase
      .from('questionLists')
      .select('folder_id')
      .eq('id', listId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error } = await supabase
      .from('questionLists')
      .update({
        ...updateData,
      updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (error) throw error;

    // Se a pasta mudou, atualizar contadores
    if (updateData.folder_id !== undefined && updateData.folder_id !== oldData.folder_id) {
      // Decrementar pasta antiga
      if (oldData.folder_id) {
        await updateFolderListCount(oldData.folder_id, -1);
      }
      // Incrementar pasta nova
      if (updateData.folder_id) {
        await updateFolderListCount(updateData.folder_id, 1);
      }
    }

    // Limpar cache
    listsCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar lista:', error);
    throw error;
  }
};

/**
 * Deletar lista (soft delete)
 */
export const deleteQuestionList = async (listId) => {
  try {
    // Buscar dados da lista primeiro
    const { data: listData, error: fetchError } = await supabase
      .from('questionLists')
      .select('folder_id')
      .eq('id', listId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const { error } = await supabase
      .from('questionLists')
      .update({
        status: 'DELETED',
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (error) throw error;

    // Se a lista estava em uma pasta, decrementar contador
    if (listData.folder_id) {
      await updateFolderListCount(listData.folder_id, -1);
    }

    // Limpar cache
    listsCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao deletar lista:', error);
    throw error;
  }
};

/**
 * Mover lista para pasta
 */
export const moveListToFolder = async (listId, newFolderId) => {
  try {
    // Buscar dados da lista primeiro
    const { data: listData, error: fetchError } = await supabase
      .from('questionLists')
      .select('folder_id')
      .eq('id', listId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const oldFolderId = listData.folder_id;

    const { error } = await supabase
      .from('questionLists')
      .update({
        folder_id: newFolderId,
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (error) throw error;

    // Atualizar contadores das pastas
    if (oldFolderId) {
      await updateFolderListCount(oldFolderId, -1);
    }
    if (newFolderId) {
      await updateFolderListCount(newFolderId, 1);
    }

    // Limpar cache
    listsCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao mover lista:', error);
    throw error;
  }
};

/**
 * Atualizar contador de listas na pasta
 */
const updateFolderListCount = async (folderId, increment) => {
  try {
    // Buscar contador atual
    const { data: folderData, error: fetchError } = await supabase
      .from('questionListFolders')
      .select('listCount')
      .eq('id', folderId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentCount = folderData.listCount || 0;
    
    const { error } = await supabase
      .from('questionListFolders')
      .update({
        listCount: Math.max(0, currentCount + increment),
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId);
    
    if (error) throw error;
    
    // Limpar cache das pastas
    foldersCache.clear();
  } catch (error) {
    console.error('Erro ao atualizar contador da pasta:', error);
  }
};

/**
 * Limpar todos os caches
 */
export const clearQuestionListCache = () => {
  foldersCache.clear();
  listsCache.clear();
};

/**
 * Buscar uma lista específica com suas questões
 */
export const getQuestionListById = async (listId) => {
  try {
    const { data: listData, error: listError } = await supabase
      .from('questionLists')
      .select('*')
      .eq('id', listId)
      .single();
    
    if (listError) {
      if (listError.code === 'PGRST116') {
        throw new Error('Lista não encontrada');
      }
      throw listError;
    }
    
    const listInfo = {
      id: listData.id,
      ...listData
    };

    // Se a lista tem questões salvas, buscar os dados completos
    if (listData.questions && listData.questions.length > 0) {
      console.log('Carregando questões para lista:', listId);
      console.log('IDs das questões:', listData.questions.map(q => q.questionId));
      
      const question_ids = listData.questions.map(q => q.question_id);
      
      // Buscar questões usando Supabase
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      
      console.log(`Buscando ${questionIds.length} questões, encontrou ${questionsData?.length || 0}`);
      
      const fullQuestions = questionsData.map(questionData => {
        const orderInfo = listData.questions.find(q => q.question_id === questionData.id);
        
        return {
          ...questionData,
          order: orderInfo?.order || 0
        };
      });
      
      // Ordenar questões pela ordem salva
      fullQuestions.sort((a, b) => a.order - b.order);
      listInfo.questions = fullQuestions;
      
      console.log('Total carregado:', fullQuestions.length, 'questões');
    } else {
      listInfo.questions = [];
    }

    return listInfo;
  } catch (error) {
    console.error('Erro ao buscar lista:', error);
    throw error;
  }
};

/**
 * Buscar uma pasta específica
 */
export const getFolderById = async (folderId) => {
  try {
    const { data: folderData, error } = await supabase
      .from('questionListFolders')
      .select('*')
      .eq('id', folderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Pasta não encontrada');
      }
      throw error;
    }
    
    return {
      id: folderData.id,
      ...folderData
    };
  } catch (error) {
    console.error('Erro ao buscar pasta:', error);
    throw error;
  }
};

/**
 * Salvar questões em uma lista
 */
export const saveQuestionsToList = async (listId, questions) => {
  const user = getCurrentUser();
  
  try {
    // Preparar dados das questões para salvar
    const questionsData = questions.map((question, index) => ({
      question_id: question.id,
      order: index,
      addedAt: new Date().toISOString(),
      titulo: question.titulo,
      materia: question.materia,
      dificuldade: question.dificuldade,
      ano: question.ano
    }));
    
    // Atualizar a lista com as questões
    const { error } = await supabase
      .from('questionLists')
      .update({
        questions: questionsData,
        questionCount: questions.length,
        lastAddedAt: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);
    
    if (error) throw error;
    
    // Limpar cache
    listsCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar questões na lista:', error);
    throw error;
  }
};