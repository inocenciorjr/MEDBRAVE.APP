import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { generateQuestionId } from '../utils/idGenerator';

const QUESTIONS_COLLECTION = 'questions';

export interface Question {
  id: string;
  statement: string;
  description?: string;
  type: string;
  alternatives?: { text: string; isCorrect: boolean; explanation?: string }[];
  tags?: string[];
  isAnnulled?: boolean;
  isOutdated?: boolean;
  status?: string; // DRAFT, PUBLISHED, ARCHIVED
  difficulty?: string; // EASY, MEDIUM, HARD
  filterIds?: string[];
  educationalFilters?: string[];
  subFilterIds?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

function parseDoc(docSnap: any): Question {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
  };
}

export async function createQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
  const now = Timestamp.now();
  
  // Gerar ID determinístico baseado no enunciado
  const questionId = generateQuestionId(question.statement);
  const ref = doc(collection(db, QUESTIONS_COLLECTION), questionId);

  const questionToSave = {
    ...question,
    id: questionId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(ref, questionToSave);
    return { ...question, id: questionId, createdAt: now.toDate(), updatedAt: now.toDate() };
  } catch (error) {
    console.error('❌ Erro ao salvar questão:', error);
    throw error;
  }
}

export async function updateQuestion(question: Partial<Question> & { id: string }): Promise<void> {
  if (!question.id) throw new Error('ID da questão é obrigatório');
  const ref = doc(db, QUESTIONS_COLLECTION, question.id);
  await updateDoc(ref, {
    ...question,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  if (!id) throw new Error('ID da questão é obrigatório');
  await deleteDoc(doc(db, QUESTIONS_COLLECTION, id));
}

export async function getQuestion(id: string): Promise<Question | null> {
  if (!id) throw new Error('ID da questão é obrigatório');
  const ref = doc(db, QUESTIONS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return parseDoc(snap);
}

export interface ListQuestionsOptions {
  pageSize?: number;
  lastDoc?: any;
  status?: string;
  filterIds?: string[];
  subFilterIds?: string[];
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface ListQuestionsResult {
  questions: Question[];
  lastDoc: any;
  hasMore: boolean;
  total?: number;
}

// Função otimizada com paginação e filtros
export async function listQuestions(options: ListQuestionsOptions = {}): Promise<ListQuestionsResult> {
  try {
    const {
      pageSize = 50, // Limite padrão de 50 questões por página
      lastDoc,
      status,
      filterIds,
      subFilterIds,
      orderByField = 'updatedAt',
      orderDirection = 'desc'
    } = options;

    // Construir query com filtros
    let q = collection(db, QUESTIONS_COLLECTION);
    const constraints = [];

    // Adicionar filtros se fornecidos
    if (status) {
      constraints.push(where('status', '==', status));
    }
    
    if (filterIds && filterIds.length > 0) {
      constraints.push(where('filterIds', 'array-contains-any', filterIds.slice(0, 10))); // Firestore limita a 10 itens
    }
    
    if (subFilterIds && subFilterIds.length > 0) {
      constraints.push(where('subFilterIds', 'array-contains-any', subFilterIds.slice(0, 10)));
    }

    // Adicionar ordenação
    constraints.push(orderBy(orderByField, orderDirection));
    
    // Adicionar limite
    constraints.push(limit(pageSize + 1)); // +1 para verificar se há mais páginas
    
    // Adicionar cursor de paginação se fornecido
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    // Executar query
    const finalQuery = query(q, ...constraints);
    const snap = await getDocs(finalQuery);
    
    const docs = snap.docs;
    const hasMore = docs.length > pageSize;
    
    // Remover o documento extra usado para verificar hasMore
    const questions = docs.slice(0, pageSize).map(parseDoc);
    const newLastDoc = questions.length > 0 ? docs[questions.length - 1] : null;

    return {
      questions,
      lastDoc: newLastDoc,
      hasMore
    };
  } catch (error) {
    console.error('❌ Erro ao buscar questões:', error);
    throw error;
  }
}

// Função legacy para compatibilidade (deprecated)
export async function listAllQuestions(): Promise<Question[]> {
  console.warn('⚠️ listAllQuestions está deprecated. Use listQuestions com paginação.');
  try {
    const snap = await getDocs(collection(db, QUESTIONS_COLLECTION));
    return snap.docs.map(parseDoc);
  } catch (error) {
    console.error('❌ Erro ao buscar questões:', error);
    throw error;
  }
}