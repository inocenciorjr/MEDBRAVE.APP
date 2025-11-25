import { Folder, Subject, Institution, QuestionList } from '@/types/banco-questoes';

export const mockFolders: Folder[] = [
  {
    id: 'folder-1',
    name: 'Minhas Listas',
    parentId: null,
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    icon: 'folder_open',
    children: [
      {
        id: 'folder-2',
        name: 'Revalida 2024',
        parentId: 'folder-1',
        userId: 'user-1',
        createdAt: new Date('2024-01-15'),
        icon: 'folder',
        items: [
          { id: 'list-1', name: 'Lista de Cirurgia', type: 'list' },
          { id: 'list-2', name: 'Lista de Clínica Médica', type: 'list' },
        ],
      },
      {
        id: 'folder-3',
        name: 'Residência Médica',
        parentId: 'folder-1',
        userId: 'user-1',
        createdAt: new Date('2024-02-01'),
        icon: 'folder',
      },
    ],
    items: [
      { id: 'list-3', name: 'Lista de Pediatria', type: 'list' },
    ],
  },
];

export const mockSubjects: Subject[] = [
  {
    id: 'subject-1',
    name: 'Cirurgia Geral',
    parentId: null,
    category: 'cirurgia',
    categoryLabel: 'Cirurgia',
    categoryColor: 'text-green-800 bg-green-100',
    categoryIcon: 'local_hospital',
    type: 'specialty',
    children: [
      {
        id: 'subject-1-1',
        name: 'Cirurgia Abdominal',
        parentId: 'subject-1',
        category: 'cirurgia',
        categoryLabel: 'Cirurgia',
        categoryColor: 'text-green-800 bg-green-100',
        categoryIcon: 'local_hospital',
        type: 'topic',
      },
      {
        id: 'subject-1-2',
        name: 'Trauma',
        parentId: 'subject-1',
        category: 'cirurgia',
        categoryLabel: 'Cirurgia',
        categoryColor: 'text-green-800 bg-green-100',
        categoryIcon: 'local_hospital',
        type: 'topic',
      },
    ],
  },
  {
    id: 'subject-2',
    name: 'Clínica Médica',
    parentId: null,
    category: 'clinica-medica',
    categoryLabel: 'Clínica Médica',
    categoryColor: 'text-blue-800 bg-blue-100',
    categoryIcon: 'stethoscope',
    type: 'specialty',
    children: [
      {
        id: 'subject-2-1',
        name: 'Cardiologia',
        parentId: 'subject-2',
        category: 'clinica-medica',
        categoryLabel: 'Clínica Médica',
        categoryColor: 'text-blue-800 bg-blue-100',
        categoryIcon: 'stethoscope',
        type: 'topic',
      },
      {
        id: 'subject-2-2',
        name: 'Pneumologia',
        parentId: 'subject-2',
        category: 'clinica-medica',
        categoryLabel: 'Clínica Médica',
        categoryColor: 'text-blue-800 bg-blue-100',
        categoryIcon: 'stethoscope',
        type: 'topic',
      },
    ],
  },
  {
    id: 'subject-3',
    name: 'Medicina Preventiva e Social',
    parentId: null,
    category: 'preventiva',
    categoryLabel: 'Preventiva',
    categoryColor: 'text-purple-800 bg-purple-100',
    categoryIcon: 'health_and_safety',
    type: 'specialty',
    children: [
      {
        id: 'subject-3-1',
        name: 'A evolução do SUS',
        parentId: 'subject-3',
        category: 'preventiva',
        categoryLabel: 'Preventiva',
        categoryColor: 'text-purple-800 bg-purple-100',
        categoryIcon: 'health_and_safety',
        type: 'topic',
      },
      {
        id: 'subject-3-2',
        name: 'Aspectos Históricos do SUS',
        parentId: 'subject-3',
        category: 'preventiva',
        categoryLabel: 'Preventiva',
        categoryColor: 'text-purple-800 bg-purple-100',
        categoryIcon: 'health_and_safety',
        type: 'topic',
      },
      {
        id: 'subject-3-3',
        name: 'Gasometria no SUS-SP',
        parentId: 'subject-3',
        category: 'preventiva',
        categoryLabel: 'Preventiva',
        categoryColor: 'text-purple-800 bg-purple-100',
        categoryIcon: 'health_and_safety',
        type: 'topic',
      },
    ],
  },
  {
    id: 'subject-4',
    name: 'Pediatria',
    parentId: null,
    category: 'pediatria',
    categoryLabel: 'Pediatria',
    categoryColor: 'text-amber-800 bg-amber-100',
    categoryIcon: 'child_care',
    type: 'specialty',
  },
];

export const mockInstitutions: Institution[] = [
  { id: 'inst-1', name: 'SUS-BA', state: 'BA', acronym: 'SUS-BA' },
  { id: 'inst-2', name: 'UFBA', state: 'BA', acronym: 'UFBA' },
  { id: 'inst-3', name: 'INEP - REVALIDA', state: 'DF', acronym: 'INEP' },
  { id: 'inst-4', name: 'ENARE', state: 'DF', acronym: 'ENARE' },
  { id: 'inst-5', name: 'USP', state: 'SP', acronym: 'USP' },
  { id: 'inst-6', name: 'SUS-SP', state: 'SP', acronym: 'SUS-SP' },
];

export const mockYears: number[] = Array.from({ length: 16 }, (_, i) => 2025 - i); // 2025 até 2010

export const mockQuestionLists: QuestionList[] = [];

/**
 * NOTA: Os dados acima são mocks para fallback.
 * O sistema agora usa dados reais do banco de dados através dos hooks:
 * - useFilterHierarchy() para filtros e subfiltros
 * - useAvailableYears() para anos
 * - useAvailableInstitutions() para instituições
 * - useSearchQuestions() para buscar questões reais
 */
