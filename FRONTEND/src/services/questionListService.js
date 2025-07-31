import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Cache para otimização
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos
const foldersCache = new Map();
const listsCache = new Map();

// Função para obter usuário atual autenticado
const getCurrentUser = () => {
  const user = auth.currentUser;
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
  const cacheKey = generateCacheKey({ userId: user.uid, type: 'folders' });
  const cached = foldersCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const foldersRef = collection(db, 'questionListFolders');
    const q = query(
      foldersRef,
      where('userId', '==', user.uid),
      where('status', '==', 'ACTIVE'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const folders = [];
    
    querySnapshot.forEach((doc) => {
      folders.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });

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
    const foldersRef = collection(db, 'questionListFolders');
    const docRef = await addDoc(foldersRef, {
      ...folderData,
      userId: user.uid,
      listCount: 0,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Limpar cache
    foldersCache.clear();
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    throw error;
  }
};

/**
 * Atualizar pasta
 */
export const updateFolder = async (folderId, updateData) => {
  try {
    const folderRef = doc(db, 'questionListFolders', folderId);
    await updateDoc(folderRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

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
export const deleteFolder = async (folderId) => {
  try {
    const folderRef = doc(db, 'questionListFolders', folderId);
    await updateDoc(folderRef, {
      status: 'DELETED',
      updatedAt: serverTimestamp()
    });

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
    const batch = writeBatch(db);
    
    folderUpdates.forEach(({ id, order }) => {
      const folderRef = doc(db, 'questionListFolders', id);
      batch.update(folderRef, { 
        order,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
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
export const getUserQuestionLists = async (folderId = null) => {
  const user = getCurrentUser();
  const cacheKey = generateCacheKey({ userId: user.uid, folderId, type: 'lists' });
  const cached = listsCache.get(cacheKey);
  
  if (isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const listsRef = collection(db, 'questionLists');
    let q;
    
    if (folderId === null) {
      // Buscar listas sem pasta
      q = query(
        listsRef,
        where('userId', '==', user.uid),
        where('status', '==', 'ACTIVE'),
        where('folderId', '==', null),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Buscar listas de uma pasta específica
      q = query(
        listsRef,
        where('userId', '==', user.uid),
        where('status', '==', 'ACTIVE'),
        where('folderId', '==', folderId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const lists = [];
    
    querySnapshot.forEach((doc) => {
      lists.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastStudyDate: doc.data().lastStudyDate?.toDate(),
        lastAddedAt: doc.data().lastAddedAt?.toDate()
      });
    });

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
    const listsRef = collection(db, 'questionLists');
    const docRef = await addDoc(listsRef, {
      name: listData.name || '',
      description: listData.description || '',
      folderId: listData.folderId || null,
      isPublic: listData.isPublic || false,
      tags: listData.tags || [],
      userId: user.uid,
      questionCount: 0,
      status: 'ACTIVE',
      viewCount: 0,
      favoriteCount: 0,
      completionPercentage: 0,
      lastStudyDate: null,
      lastAddedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Se a lista foi criada em uma pasta, atualizar contador da pasta
    if (listData.folderId) {
      await updateFolderListCount(listData.folderId, 1);
    }

    // Limpar cache
    listsCache.clear();
    
    return docRef.id;
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
    const listRef = doc(db, 'questionLists', listId);
    const oldList = await getDoc(listRef);
    const oldData = oldList.data();
    
    await updateDoc(listRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });

    // Se a pasta mudou, atualizar contadores
    if (updateData.folderId !== undefined && updateData.folderId !== oldData.folderId) {
      // Decrementar pasta antiga
      if (oldData.folderId) {
        await updateFolderListCount(oldData.folderId, -1);
      }
      // Incrementar pasta nova
      if (updateData.folderId) {
        await updateFolderListCount(updateData.folderId, 1);
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
    const listRef = doc(db, 'questionLists', listId);
    const listDoc = await getDoc(listRef);
    const listData = listDoc.data();
    
    await updateDoc(listRef, {
      status: 'DELETED',
      updatedAt: serverTimestamp()
    });

    // Se a lista estava em uma pasta, decrementar contador
    if (listData.folderId) {
      await updateFolderListCount(listData.folderId, -1);
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
    const listRef = doc(db, 'questionLists', listId);
    const listDoc = await getDoc(listRef);
    const listData = listDoc.data();
    const oldFolderId = listData.folderId;

    await updateDoc(listRef, {
      folderId: newFolderId,
      updatedAt: serverTimestamp()
    });

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
    const folderRef = doc(db, 'questionListFolders', folderId);
    const folderDoc = await getDoc(folderRef);
    const currentCount = folderDoc.data().listCount || 0;
    
    await updateDoc(folderRef, {
      listCount: Math.max(0, currentCount + increment),
      updatedAt: serverTimestamp()
    });
    
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
    const listRef = doc(db, 'questionLists', listId);
    const listDoc = await getDoc(listRef);
    
    if (!listDoc.exists()) {
      throw new Error('Lista não encontrada');
    }
    
    const data = listDoc.data();
    const listInfo = {
      id: listDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      lastStudyDate: data.lastStudyDate?.toDate(),
      lastAddedAt: data.lastAddedAt?.toDate()
    };

    // Se a lista tem questões salvas, buscar os dados completos
    if (data.questions && data.questions.length > 0) {
      console.log('Carregando questões para lista:', listId);
      console.log('IDs das questões:', data.questions.map(q => q.questionId));
      
      const questionsRef = collection(db, 'questions');
      const questionIds = data.questions.map(q => q.questionId);
      
      // Buscar questões em lotes de 10 (limite do Firestore para 'in')
      const fullQuestions = [];
      for (let i = 0; i < questionIds.length; i += 10) {
        const batch = questionIds.slice(i, i + 10);
        const q = query(questionsRef, where('__name__', 'in', batch));
        const querySnapshot = await getDocs(q);
        
        console.log(`Lote ${Math.floor(i/10) + 1}: Buscando ${batch.length} questões, encontrou ${querySnapshot.size}`);
        
        querySnapshot.forEach((doc) => {
          const questionData = { id: doc.id, ...doc.data() };
          const orderInfo = data.questions.find(q => q.questionId === doc.id);
          
          fullQuestions.push({
            ...questionData,
            order: orderInfo?.order || 0
          });
        });
      }
      
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
    const folderRef = doc(db, 'questionListFolders', folderId);
    const folderDoc = await getDoc(folderRef);
    
    if (!folderDoc.exists()) {
      throw new Error('Pasta não encontrada');
    }
    
    const data = folderDoc.data();
    return {
      id: folderDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate()
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
    const batch = writeBatch(db);
    
    // Preparar dados das questões para salvar
    const questionsData = questions.map((question, index) => ({
      questionId: question.id,
      order: index,
      addedAt: new Date(),
      titulo: question.titulo,
      materia: question.materia,
      dificuldade: question.dificuldade,
      ano: question.ano
    }));
    
    // Atualizar a lista com as questões
    const listRef = doc(db, 'questionLists', listId);
    batch.update(listRef, {
      questions: questionsData,
      questionCount: questions.length,
      lastAddedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // Limpar cache
    listsCache.clear();
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar questões na lista:', error);
    throw error;
  }
};