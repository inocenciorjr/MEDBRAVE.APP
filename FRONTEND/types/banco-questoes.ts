export interface QuestionList {
  id: string;
  name: string;
  folderId: string;
  createdAt: Date;
  updatedAt: Date;
  subjectIds: string[];
  years: number[];
  institutionIds: string[];
  totalQuestions: number;
  progress: number;
  tags: Tag[];
}

export interface Tag {
  id: string;
  label: string;
  color: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: Date;
  icon: 'folder' | 'folder_open';
  children?: Folder[];
  items?: ListItem[];
}

export interface ListItem {
  id: string;
  name: string;
  type: 'list';
}

export interface Subject {
  id: string;
  name: string;
  parentId: string | null;
  category: 'cirurgia' | 'clinica-medica' | 'preventiva' | 'pediatria' | 'ginecologia' | 'obstetricia' | 'variados' | 'outros';
  categoryLabel: string;
  categoryColor: string;
  categoryIcon: string;
  type: 'specialty' | 'topic';
  children?: Subject[];
}

export interface Institution {
  id: string;
  name: string;
  state: string;
  acronym: string;
}

export interface CreateListState {
  step: 'geral' | 'assuntos' | 'anos' | 'instituicoes';
  listName: string;
  folderId: string | null;
  selectedSubjects: string[];
  selectedYears: number[];
  selectedInstitutions: string[];
  selectedExamTypes?: string[];
  totalQuestions: number;
  questionLimit: number;
}
