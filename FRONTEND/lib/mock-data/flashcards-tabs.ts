import { CollectionWithStats, Institution, Specialty } from '@/types/flashcards';

// Mock collections with stats
export const mockMyCollections: CollectionWithStats[] = [
  {
    id: '1',
    name: 'Farmacodermias e Dermatoses',
    description: undefined,
    deckCount: 20,
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-10-31T10:00:00Z',
    institution: undefined,
    tags: [
      { id: 't1', label: 'Baixa prev.', icon: 'trending_down', color: 'purple' },
      { id: 't2', label: 'PREV', icon: 'medication', color: 'purple' },
    ],
    newCards: 0,
    isAdded: true,
  },
  {
    id: '2',
    name: 'HIAE (Cirurgia)',
    description: undefined,
    deckCount: 20,
    createdAt: '2025-02-10T10:00:00Z',
    updatedAt: '2025-10-31T10:00:00Z',
    institution: 'EINSTEIN - SP',
    tags: [
      { id: 't3', label: 'CIR', icon: 'autorenew', color: 'teal' },
      { id: 't4', label: 'Deck de Aula', icon: 'menu_book', color: 'teal' },
    ],
    newCards: 295,
    isAdded: true,
  },
];

export const mockImportedCollections: CollectionWithStats[] = [
  {
    id: '3',
    name: 'Farmacodermias e Dermatoses',
    description: undefined,
    deckCount: 20,
    createdAt: '2025-03-20T10:00:00Z',
    updatedAt: '2025-10-31T10:00:00Z',
    institution: undefined,
    tags: [
      { id: 't5', label: 'Baixa prev.', icon: 'trending_down', color: 'purple' },
      { id: 't6', label: 'PREV', icon: 'medication', color: 'purple' },
    ],
    newCards: 0,
    isAdded: true,
  },
  {
    id: '4',
    name: 'HIAE (Cirurgia)',
    description: undefined,
    deckCount: 20,
    createdAt: '2025-04-05T10:00:00Z',
    updatedAt: '2025-10-31T10:00:00Z',
    institution: 'EINSTEIN - SP',
    tags: [
      { id: 't7', label: 'CIR', icon: 'autorenew', color: 'teal' },
      { id: 't8', label: 'Deck de Aula', icon: 'menu_book', color: 'teal' },
    ],
    newCards: 295,
    isAdded: true,
  },
];

// Mock institutions
export const mockInstitutions: Institution[] = [
  {
    id: 'einstein',
    name: 'EINSTEIN',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzd6lyQKOAq7mzuEstoS1hCqMZGVE20h-M_YTWtt3dXtRyCR2sdENdWqb25ROJdGHrNWPoxw6ZrwDSqCaVlsu2cIFDbdHOsGoo0rUB7ZX38SctgflfGwO4h8Q8pTBKUWnLz8FeRegLPogTAXteKBK5W5sAbRaJw7YLJcfWbR9nIFq5feSaMnf3lhC71gFfmcC5HR0O5Lr723mQfZTrxf8QZA2Ahh0XnynCILF8vOciSgEHmfEJ6NVTQZ7R9QfhEdCGUSmBEDNjRqR5',
    deckCount: 5,
    likes: 342,
  },
  {
    id: 'famema',
    name: 'FAMEMA',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAc6f1C8bLY7hP1Thxv_UpoCPOeJj_RpP_UdJ8yHQrvYj7jvYNUJnLNp0DBfqjIIViMuSvsZoydkvehbieu0KwiPh7nDi91FknWijzuM-R4fqyVPtsxao4DgerdvT0HWbibe3fM3oJxDiBt_XUWuDfAeD5EHB-7skRlQt-eb-iD2ITrc9Q2IZWXxQIgii-yjmYaDQYkk1882jPlo2j8WDBJGIHMWXyk_QBmIO-h8DEGr8jtIkGeg2Rj3WmCiltbyiAzybugRN6h__N',
    deckCount: 5,
    likes: 287,
  },
  {
    id: 'famerp',
    name: 'FAMERP',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA6KSn3djIi3DnBDOe7pQ4kQa0rPkgoB9JzxDnL1BVCFuDDY7NdwRkPI1SkNBShtCVBY7vo4HeyEuiXnylhhPfnkqWZnxZIEUJyHeTiXeoGrlse8MxWhvIraBUgVWtWorigd37suySAEpJ_P2gaqtoSFGfyKEqZdvB2qd5sYKLS0Pyc1lzpyDmpitodkkMMZynfIwBfRCSDIcLeXemPW_CJfCXcTkQjZ17q8BlBTcpzkG-HlzDBcGkWObhMdstEC6YgaRpFMSl4fWqB',
    deckCount: 5,
    likes: 198,
  },
  {
    id: 'fmabc',
    name: 'FMABC',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5dlJOckyxkPC8vtYMWcSh3_uHVNgO9J7xGkepojwP4aavZ7ZgLZw2hFGJyp-qqEimyJxrSmy7NSAP02HTW47k_l2a9mPoIA8jfhMfCsROdrYd1NSf_Xs2Jds2vySQxIxaKAhRqA7NpQGjMUg2YblQQBQ8C6X9o-HzQUhdfLj_HHt8FQhcUR5gczAYsxdz4hXRRM6t2GcVn2TWr1cINn5lh_mVuS-kU4Z7Q7QdsGdKrCi8qFN1DB-o_NjFMJltwjamVgo-BXHXVyo4',
    deckCount: 5,
    likes: 156,
  },
  {
    id: 'outra',
    name: 'OUTRA',
    logo: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzd6lyQKOAq7mzuEstoS1hCqMZGVE20h-M_YTWtt3dXtRyCR2sdENdWqb25ROJdGHrNWPoxw6ZrwDSqCaVlsu2cIFDbdHOsGoo0rUB7ZX38SctgflfGwO4h8Q8pTBKUWnLz8FeRegLPogTAXteKBK5W5sAbRaJw7YLJcfWbR9nIFq5feSaMnf3lhC71gFfmcC5HR0O5Lr723mQfZTrxf8QZA2Ahh0XnynCILF8vOciSgEHmfEJ6NVTQZ7R9QfhEdCGUSmBEDNjRqR5',
    deckCount: 5,
    likes: 423,
  },
];

// Mock specialties
export const mockSpecialties: Specialty[] = [
  {
    id: 'clinica-medica',
    name: 'Clínica Médica',
    icon: 'stethoscope',
    iconColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 dark:text-blue-400',
    deckCount: 77,
    likes: 1243,
    imports: 892,
    isHot: true,
    author: 'Dr. Carlos Silva',
  },
  {
    id: 'pediatria',
    name: 'Pediatria',
    icon: 'child_care',
    iconColor: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-500 dark:text-yellow-400',
    deckCount: 59,
    likes: 987,
    imports: 654,
    isHot: true,
    author: 'Dra. Ana Santos',
  },
  {
    id: 'preventiva',
    name: 'Preventiva e Social',
    icon: 'groups',
    iconColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500 dark:text-purple-400',
    deckCount: 17,
    likes: 432,
    imports: 287,
    isHot: false,
    author: 'Dr. Pedro Oliveira',
  },
  {
    id: 'ginecologia',
    name: 'Ginecologia e Obstetrícia',
    icon: 'female',
    iconColor: 'bg-pink-100 dark:bg-pink-900/50 text-pink-500 dark:text-pink-400',
    deckCount: 37,
    likes: 765,
    imports: 521,
    isHot: false,
    author: 'Dra. Maria Costa',
  },
  {
    id: 'cirurgia',
    name: 'Cirurgia Geral',
    icon: 'cut',
    iconColor: 'bg-teal-100 dark:bg-teal-900/50 text-teal-500 dark:text-teal-400',
    deckCount: 51,
    likes: 1089,
    imports: 743,
    isHot: true,
    author: 'Dr. João Ferreira',
  },
  {
    id: 'pronto-socorro',
    name: 'Pronto Socorro',
    icon: 'local_hospital',
    iconColor: 'bg-red-100 dark:bg-red-900/50 text-red-500 dark:text-red-400',
    deckCount: 25,
    likes: 654,
    imports: 412,
    isHot: false,
    author: 'Dr. Lucas Almeida',
  },
];
