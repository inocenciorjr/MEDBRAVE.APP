/**
 * Tipos para leitura de arquivos APKG (Anki Package)
 */

export interface ApkgDeck {
  id: string;
  name: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface ApkgCard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  tags: string[];
  created_at?: Date;
  updated_at?: Date;
}

export interface ApkgImportResult {
  deck: ApkgDeck;
  cards: ApkgCard[];
  total_cards: number;
  imported_cards: number;
  skipped_cards: number;
}

export interface ApkgFileInfo {
  name: string;
  size: number;
  type: string;
  last_modified: Date;
}