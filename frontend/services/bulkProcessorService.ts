// Interface para resposta das questões em lote
export interface BulkQuestionResponse {
  success: boolean;
  total_count?: number;
  questions: BulkQuestion[];
  images?: any[];
  tables?: any[];
  stats?: {
    questions_found: number;
    images_found: number;
    tables_found: number;
    missing_questions: number[];
    missing_count: number;
    extraction_rate: string;
    method: string;
  };
  message: string;
  missing_questions?: number[];
  missing_count?: number;
  extraction_rate?: string;
  method?: string;
}

// Interface para questão em lote
export interface BulkQuestion {
  numero?: string;
  number?: number;
  enunciado?: string;
  statement?: string;
  alternativas?: Alternative[];
  alternatives?: Alternative[];
  visual_content_count?: number;
  associated_image_ids?: string[];
  associated_table_ids?: string[];
}

// Interface para alternativa
export interface Alternative {
  letter: string;
  text: string;
}

// Base URL da API
const API_BASE_URL = '';

// Importar o fetchWithAuth
import { fetchWithAuth } from '@/lib/utils/fetchWithAuth';

// Processa arquivo PDF da Revalida
async function processBulkPDF(pdfFile: File): Promise<BulkQuestionResponse> {
  const formData = new FormData();
  formData.append('file', pdfFile);

  const response = await fetchWithAuth(`${API_BASE_URL}/questions/bulk-from-pdf-optimized`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Processa arquivo HTML da Revalida
async function processRevalidaHTML(htmlFile: File): Promise<BulkQuestionResponse> {
  const formData = new FormData();
  formData.append('file', htmlFile);

  const response = await fetchWithAuth(`${API_BASE_URL}/questions/bulk-from-html-revalida-test`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

// Função principal que processa qualquer tipo de arquivo
export async function processBulkQuestions(file: File): Promise<BulkQuestionResponse> {
  console.log('🔄 Processando arquivo:', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  // Verifica o tipo de arquivo para decidir qual processador usar
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.split('.').pop();

  if (fileExtension === 'html' || file.type === 'text/html') {
    console.log('📄 Detectado arquivo HTML da Revalida');
    return processRevalidaHTML(file);
  } else if (fileExtension === 'pdf' || file.type === 'application/pdf') {
    console.log('📄 Detectado arquivo PDF');
    return processBulkPDF(file);
  } else {
    throw new Error(`Formato de arquivo não suportado: ${fileExtension}. Apenas PDF e HTML são aceitos.`);
  }
}