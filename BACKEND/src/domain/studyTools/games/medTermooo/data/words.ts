// Lista de palavras médicas de 5-8 letras
export interface MedicalWord {
  word: string;
  hint: string;
  category: string;
}

export const MEDICAL_WORDS: MedicalWord[] = [
  // 5 letras
  { word: 'FEBRE', hint: 'Elevação da temperatura corporal', category: 'Sintoma' },
  { word: 'TOSSE', hint: 'Reflexo de expulsão de ar', category: 'Sintoma' },
  { word: 'EDEMA', hint: 'Acúmulo de líquido nos tecidos', category: 'Sinal' },
  { word: 'PULSO', hint: 'Batimento arterial palpável', category: 'Sinal Vital' },
  { word: 'TUMOR', hint: 'Massa anormal de tecido', category: 'Oncologia' },
  { word: 'CISTO', hint: 'Cavidade fechada com líquido', category: 'Patologia' },
  { word: 'LESAO', hint: 'Dano tecidual', category: 'Patologia' },
  { word: 'SONDA', hint: 'Tubo para drenagem', category: 'Equipamento' },
  { word: 'DRENO', hint: 'Dispositivo para drenagem', category: 'Cirurgia' },
  { word: 'GESSO', hint: 'Material de imobilização', category: 'Ortopedia' },
  { word: 'RENAL', hint: 'Relativo aos rins', category: 'Nefrologia' },
  { word: 'NASAL', hint: 'Relativo ao nariz', category: 'Otorrino' },
  { word: 'VIRAL', hint: 'Causado por vírus', category: 'Infectologia' },
  { word: 'FETAL', hint: 'Relativo ao feto', category: 'Obstetrícia' },
  { word: 'PARTO', hint: 'Nascimento', category: 'Obstetrícia' },
  { word: 'DIETA', hint: 'Regime alimentar', category: 'Nutrição' },
  { word: 'JEJUM', hint: 'Abstinência de alimentos', category: 'Preparo' },
  { word: 'EXAME', hint: 'Avaliação diagnóstica', category: 'Diagnóstico' },
  { word: 'GRIPE', hint: 'Infecção viral respiratória', category: 'Infectologia' },
  { word: 'RAIVA', hint: 'Doença viral fatal', category: 'Infectologia' },
  { word: 'MIOSE', hint: 'Contração da pupila', category: 'Oftalmologia' },
  { word: 'BOLUS', hint: 'Dose única rápida de medicamento', category: 'Farmacologia' },
  { word: 'AGUDO', hint: 'De início súbito', category: 'Clínica' },
  { word: 'BASAL', hint: 'Nível de referência', category: 'Fisiologia' },
  { word: 'OBITO', hint: 'Falecimento', category: 'Clínica' },
  { word: 'PLACA', hint: 'Depósito em parede arterial', category: 'Cardiologia' },
  { word: 'VALVA', hint: 'Estrutura cardíaca', category: 'Cardiologia' },
  { word: 'SEPTO', hint: 'Parede divisória', category: 'Anatomia' },
  { word: 'DORSO', hint: 'Parte posterior do corpo', category: 'Anatomia' },
  { word: 'URINA', hint: 'Excreção renal', category: 'Nefrologia' },
  { word: 'SEPSE', hint: 'Infecção generalizada grave', category: 'Infectologia' },
  
  // 6 letras
  { word: 'ANEMIA', hint: 'Redução de hemoglobina no sangue', category: 'Hematologia' },
  { word: 'ANGINA', hint: 'Dor torácica por isquemia', category: 'Cardiologia' },
  { word: 'CANCER', hint: 'Neoplasia maligna', category: 'Oncologia' },
  { word: 'COLICA', hint: 'Dor abdominal em cólica', category: 'Sintoma' },
  { word: 'DENGUE', hint: 'Doença viral transmitida por mosquito', category: 'Infectologia' },
  { word: 'EMBOLO', hint: 'Corpo estranho na circulação', category: 'Patologia' },
  { word: 'HERNIA', hint: 'Protrusão de órgão', category: 'Cirurgia' },
  { word: 'LIQUOR', hint: 'Líquido cefalorraquidiano', category: 'Neurologia' },
  { word: 'NODULO', hint: 'Pequena massa sólida', category: 'Patologia' },
  { word: 'PLASMA', hint: 'Parte líquida do sangue', category: 'Hematologia' },
  { word: 'SUTURA', hint: 'Costura cirúrgica', category: 'Cirurgia' },
  { word: 'TRAUMA', hint: 'Lesão por força externa', category: 'Emergência' },
  { word: 'ULCERA', hint: 'Ferida aberta em mucosa', category: 'Gastro' },
  { word: 'VACINA', hint: 'Imunização preventiva', category: 'Imunologia' },
  { word: 'VARIZE', hint: 'Dilatação venosa', category: 'Vascular' },
  { word: 'ESCARA', hint: 'Lesão por pressão', category: 'Dermatologia' },
  { word: 'COLITE', hint: 'Inflamação do cólon', category: 'Gastro' },
  { word: 'ASCITE', hint: 'Líquido na cavidade abdominal', category: 'Gastro' },
  { word: 'APNEIA', hint: 'Parada respiratória', category: 'Pneumologia' },
  { word: 'ECZEMA', hint: 'Dermatose inflamatória', category: 'Dermatologia' },
  { word: 'RINITE', hint: 'Inflamação nasal', category: 'Otorrino' },
  
  // 7 letras
  { word: 'ALERGIA', hint: 'Reação de hipersensibilidade', category: 'Imunologia' },
  { word: 'AMNESIA', hint: 'Perda de memória', category: 'Neurologia' },
  { word: 'ARTRITE', hint: 'Inflamação articular', category: 'Reumatologia' },
  { word: 'CIRROSE', hint: 'Fibrose hepática crônica', category: 'Hepatologia' },
  { word: 'EMBOLIA', hint: 'Obstrução vascular por êmbolo', category: 'Vascular' },
  { word: 'ERITEMA', hint: 'Vermelhidão da pele', category: 'Dermatologia' },
  { word: 'FIBROSE', hint: 'Formação excessiva de tecido fibroso', category: 'Patologia' },
  { word: 'HIPOXIA', hint: 'Baixa oxigenação tecidual', category: 'Fisiologia' },
  { word: 'PRURIDO', hint: 'Coceira', category: 'Dermatologia' },
  { word: 'SINCOPE', hint: 'Desmaio', category: 'Cardiologia' },
  { word: 'INFARTO', hint: 'Morte tecidual por isquemia', category: 'Cardiologia' },
  { word: 'NECROSE', hint: 'Morte celular patológica', category: 'Patologia' },
  { word: 'FRATURA', hint: 'Quebra óssea', category: 'Ortopedia' },
  { word: 'ATROFIA', hint: 'Diminuição do tamanho celular', category: 'Patologia' },
  { word: 'BIOPSIA', hint: 'Coleta de tecido para análise', category: 'Diagnóstico' },
  { word: 'CATETER', hint: 'Tubo flexível para acesso', category: 'Equipamento' },
  { word: 'NEFRITE', hint: 'Inflamação renal', category: 'Nefrologia' },
  { word: 'NEURITE', hint: 'Inflamação de nervo', category: 'Neurologia' },
  { word: 'ACIDOSE', hint: 'Excesso de ácido no sangue', category: 'Fisiologia' },
  { word: 'ADENOMA', hint: 'Tumor benigno glandular', category: 'Oncologia' },
  { word: 'AMILASE', hint: 'Enzima pancreática', category: 'Bioquímica' },
  { word: 'ARTROSE', hint: 'Degeneração articular', category: 'Ortopedia' },
  { word: 'LINFOMA', hint: 'Câncer do sistema linfático', category: 'Oncologia' },
  { word: 'SARCOMA', hint: 'Câncer de tecido conjuntivo', category: 'Oncologia' },
  { word: 'ESPASMO', hint: 'Contração muscular involuntária', category: 'Neurologia' },
  
  // 8 letras
  { word: 'ABSCESSO', hint: 'Coleção de pus', category: 'Infectologia' },
  { word: 'ALCALOSE', hint: 'Excesso de base no sangue', category: 'Fisiologia' },
  { word: 'ALOPECIA', hint: 'Queda de cabelo', category: 'Dermatologia' },
  { word: 'ARRITMIA', hint: 'Alteração do ritmo cardíaco', category: 'Cardiologia' },
  { word: 'CEFALEIA', hint: 'Dor de cabeça', category: 'Neurologia' },
  { word: 'DIABETES', hint: 'Distúrbio do metabolismo da glicose', category: 'Endócrino' },
  { word: 'DISPNEIA', hint: 'Dificuldade respiratória', category: 'Pneumologia' },
  { word: 'GASTRITE', hint: 'Inflamação do estômago', category: 'Gastro' },
  { word: 'HEPATITE', hint: 'Inflamação do fígado', category: 'Hepatologia' },
  { word: 'ISQUEMIA', hint: 'Redução do fluxo sanguíneo', category: 'Patologia' },
  { word: 'LEUCEMIA', hint: 'Câncer das células sanguíneas', category: 'Oncologia' },
  { word: 'TROMBOSE', hint: 'Formação de coágulo', category: 'Vascular' },
  { word: 'VERTIGEM', hint: 'Sensação de rotação', category: 'Otorrino' },
  { word: 'CATARATA', hint: 'Opacificação do cristalino', category: 'Oftalmologia' },
  { word: 'CELULITE', hint: 'Infecção do tecido subcutâneo', category: 'Infectologia' },
  { word: 'CONTUSAO', hint: 'Lesão por impacto sem corte', category: 'Trauma' },
  { word: 'DIARREIA', hint: 'Evacuações líquidas frequentes', category: 'Gastro' },
  { word: 'ESTENOSE', hint: 'Estreitamento de canal', category: 'Patologia' },
  { word: 'GLAUCOMA', hint: 'Aumento da pressão ocular', category: 'Oftalmologia' },
  { word: 'GLICEMIA', hint: 'Nível de glicose no sangue', category: 'Bioquímica' },
  { word: 'HEMATOMA', hint: 'Coleção de sangue', category: 'Patologia' },
  { word: 'INFECCAO', hint: 'Invasão por microrganismos', category: 'Infectologia' },
  { word: 'INSULINA', hint: 'Hormônio pancreático', category: 'Endócrino' },
  { word: 'MELANOMA', hint: 'Câncer de pele agressivo', category: 'Oncologia' },
  { word: 'MIOPATIA', hint: 'Doença muscular', category: 'Neurologia' },
  { word: 'PLAQUETA', hint: 'Célula da coagulação', category: 'Hematologia' },
  { word: 'PROLAPSO', hint: 'Queda de órgão', category: 'Cirurgia' },
  { word: 'SINUSITE', hint: 'Inflamação dos seios da face', category: 'Otorrino' },
  { word: 'TIREOIDE', hint: 'Glândula do pescoço', category: 'Endócrino' },
];

// Função para obter a palavra do dia baseada na data
export function getDailyWord(date: Date = new Date()): MedicalWord & { date: string; length: number } {
  const startDate = new Date('2024-01-01');
  const daysSinceStart = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const wordIndex = Math.abs(daysSinceStart) % MEDICAL_WORDS.length;
  const dateStr = date.toISOString().split('T')[0];
  const word = MEDICAL_WORDS[wordIndex];
  
  return {
    ...word,
    date: dateStr,
    length: word.word.length,
  };
}

// Validar se uma palavra existe na lista (para validação de palpites)
export function isValidWord(word: string): boolean {
  return MEDICAL_WORDS.some(w => w.word.toUpperCase() === word.toUpperCase());
}

// Obter todas as palavras de um tamanho específico
export function getWordsByLength(length: number): MedicalWord[] {
  return MEDICAL_WORDS.filter(w => w.word.length === length);
}
