declare module 'apkg-reader.js' {
  export class ZipHandler {
    constructor(filePath: string);
    getMediaFiles(): Promise<Record<string, Buffer>>;
    getMediaFilesMapping(): Promise<Record<string, string>>;
  }

  export interface AnkiDeck {
    id: number;
    name: string;
    [key: string]: any;
  }

  export interface AnkiNote {
    id: number;
    mid: number;
    flds: string;
    tags: string;
    [key: string]: any;
  }

  export interface AnkiCard {
    id: number;
    nid: number;
    did: number;
    [key: string]: any;
  }

  export interface AnkiModel {
    id: number;
    name: string;
    flds: any[];
    tmpls: any[];
    [key: string]: any;
  }

  export interface AnkiDatabase {
    getDeckNames(): Promise<AnkiDeck[]>;
    getNotes(): Promise<AnkiNote[]>;
    getCards(): Promise<AnkiCard[]>;
    getModels(): Promise<AnkiModel[]>;
    [key: string]: any;
  }

  export function readDatabaseFrom(zipHandler: ZipHandler): Promise<AnkiDatabase>;
} 