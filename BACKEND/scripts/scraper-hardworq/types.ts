/**
 * Types for Hardworq Scraper
 */

// CLI Options
export interface HardworqCLIOptions {
  email: string;
  password: string;
  provaId?: string; // ID específico de uma prova (opcional)
  provaName?: string; // Nome da prova para buscar (ex: "UNICAMP R1 2019")
  provaIndex?: number; // Índice da prova na lista (1-based)
  output?: string;
  verbose?: boolean;
  limit?: number; // Limite de questões por prova
}

// Raw data from Hardworq console.log
export interface HardworqQuestion {
  id: number;
  codigo: string; // "ENAREENAMED2026R1-11"
  prova: {
    id: number;
    codigo: string;
    instituicao: string;
    estado: string;
    grupo: string;
    ano: string;
  };
  enunciado: string;
  imagem: string; // URL da imagem (se houver)
  alternativas: Array<{
    id: number;
    letra: string;
    alternativa: string;
    correta: boolean;
  }>;
  explicacao_professor: string;
  explicacao_professor_img: string;
  anulada: boolean;
}

// Prova metadata
export interface ProvaMetadata {
  id: number;
  codigo: string;
  instituicao: string;
  estado: string;
  grupo: string;
  ano: string;
  totalQuestoes: number;
}

// Extraction result
export interface ExtractionResult {
  prova: ProvaMetadata;
  questions: HardworqQuestion[];
  stats: {
    totalExtracted: number;
    withExplanation: number;
    withImages: number;
    anuladas: number;
  };
  extractionTime: number; // ms
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
