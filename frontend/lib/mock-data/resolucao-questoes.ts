import { Question } from '@/types/resolucao-questoes';

export const mockQuestions: Question[] = [
  {
    id: '1',
    institution: 'UNIFESP',
    year: 2021,
    subject: 'Cirurgia vascular',
    topic: 'Especialidades cirúrgicas',
    questionNumber: 1,
    text: 'Paciente do sexo masculino, 65 anos, hipertenso e diabético, apresenta claudicação intermitente em membro inferior esquerdo há 6 meses. Ao exame físico, ausência de pulsos poplíteo e distais à esquerda. Qual a melhor conduta inicial?',
    alternatives: [
      {
        id: 'a',
        letter: 'A',
        text: 'Revascularização cirúrgica imediata',
        percentage: 15,
      },
      {
        id: 'b',
        letter: 'B',
        text: 'Controle dos fatores de risco e programa de exercícios supervisionados',
        percentage: 68,
      },
      {
        id: 'c',
        letter: 'C',
        text: 'Angioplastia transluminal percutânea',
        percentage: 12,
      },
      {
        id: 'd',
        letter: 'D',
        text: 'Amputação do membro',
        percentage: 5,
      },
    ],
    correctAlternative: 'b',
    likes: 12,
    dislikes: 1,
    tags: ['Conduta', 'Diagnóstico'],
  },
  {
    id: '2',
    institution: 'UNIFESP',
    year: 2021,
    subject: 'Cirurgia vascular',
    topic: 'Especialidades cirúrgicas',
    questionNumber: 2,
    text: 'Homem, 42 anos de idade, apresenta isquemia grave no membro inferior direito há 3 horas, com dor de forte intensidade, palidez, gradiente térmico e diminuição importante da perfusão do pé. Nega claudicação intermitente e relata malformação congênita cardíaca, sem tratamento específico. Exame físico: ausência de pulso femoral, poplíteo e distais em membro inferior direito, com pulsos normais em outros membros. Qual é a alternativa correta?',
    alternatives: [
      {
        id: 'a',
        letter: 'A',
        text: 'Deve-se realizar ultrassonografia Doppler venosa para afastar um quadro de phlegmasia alba dolens.',
        percentage: 2,
      },
      {
        id: 'b',
        letter: 'B',
        text: 'Investigar uso de drogas ilícitas pelo diagnóstico de vasoespasmo e trombose.',
        percentage: 8,
      },
      {
        id: 'c',
        letter: 'C',
        text: 'Trata-se de trombose arterial aguda com lesão ao nível do canal dos adutores em membro inferior direito.',
        percentage: 15,
      },
      {
        id: 'd',
        letter: 'D',
        text: 'Trata-se de embolia arterial aguda com provável fonte embolígena cardíaca, ou uma embolia arterial paradoxal.',
        percentage: 75,
      },
    ],
    correctAlternative: 'd',
    likes: 5,
    dislikes: 0,
    tags: ['Conduta', 'Diagnóstico'],
  },
  {
    id: '3',
    institution: 'HFA',
    year: 2017,
    subject: 'Cirurgia vascular',
    topic: 'Especialidades cirúrgicas',
    questionNumber: 3,
    text: 'Paciente T. A. G., 55 anos de idade, tabagista, hipertenso, chega ao pronto-socorro apresentando dor torácica com irradiação para o dorso, além de dissociação de pulsos de 30 mmHg entre membros superiores. O exame físico revela FC = 112 bpm; PA = 176 mmHg x 100 mmHg; SatO₂ = 96%. Considerando o quadro apresentado, assinale a alternativa que indica a melhor conduta a ser adotada.',
    images: [
      'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    ],
    alternatives: [
      {
        id: 'a',
        letter: 'A',
        text: 'Tomografia computadorizada e controle pressórico.',
        percentage: 72,
      },
      {
        id: 'b',
        letter: 'B',
        text: 'Arteriografia com cirurgia imediata.',
        percentage: 18,
      },
      {
        id: 'c',
        letter: 'C',
        text: 'Eletrocardiograma com protocolo MONAB.',
        percentage: 5,
      },
      {
        id: 'd',
        letter: 'D',
        text: 'Radiografia de tórax e antibioticoterapia.',
        percentage: 3,
      },
      {
        id: 'e',
        letter: 'E',
        text: 'Cintilografia e analgesia.',
        percentage: 2,
      },
    ],
    correctAlternative: 'a',
    likes: 20,
    dislikes: 0,
    tags: ['Conduta'],
  },
];

export const mockQuestion = mockQuestions[1]; // Default to question 2
export const mockQuestionList = mockQuestions;
