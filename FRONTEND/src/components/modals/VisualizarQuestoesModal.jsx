import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Clock, 
  BookOpen, 
  GraduationCap,
  ChevronRight,
  Filter,
  X
} from 'lucide-react';

const VisualizarQuestoesModal = ({ 
  isOpen, 
  onClose, 
  questionCount = 0, 
  filtros = {},
  onNavigateToResolver 
}) => {
  const [questoes, setQuestoes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dados de exemplo das questões
  const questoesExemplo = [
    {
      id: 1,
      titulo: "Paciente com dor torácica e alterações no ECG",
      enunciado: "Paciente de 65 anos, sexo masculino, hipertenso e diabético, apresenta-se ao pronto-socorro com quadro de dor torácica de início súbito há 2 horas, de característica opressiva, irradiando para membro superior esquerdo e mandíbula. Ao exame físico: PA = 160/100 mmHg, FC = 110 bpm, FR = 24 irpm. Ausculta cardíaca revela B3 em foco mitral. ECG mostra supradesnivelamento do segmento ST em DII, DIII e aVF.",
      materia: "Cardiologia",
      universidade: "USP",
      ano: "2023",
      dificuldade: "Médio",
      tempo: "3 min",
      tipo: "Múltipla Escolha",
      alternativas: 4
    },
    {
      id: 2,
      titulo: "Diagnóstico diferencial em pneumonia",
      enunciado: "Paciente de 45 anos apresenta febre há 3 dias, tosse produtiva com expectoração purulenta, dispneia aos esforços e dor pleurítica. Radiografia de tórax mostra consolidação em lobo inferior direito. Leucocitose com desvio à esquerda. Qual o agente etiológico mais provável?",
      materia: "Pneumologia",
      universidade: "UNIFESP",
      ano: "2023",
      dificuldade: "Fácil",
      tempo: "2 min",
      tipo: "Múltipla Escolha",
      alternativas: 5
    },
    {
      id: 3,
      titulo: "Manejo de crise hipertensiva",
      enunciado: "Paciente de 58 anos chega ao pronto-socorro com PA = 220/120 mmHg, cefaleia intensa, náuseas e vômitos. Nega dor torácica ou dispneia. Fundoscopia revela hemorragias retinianas e exsudatos. Qual a conduta mais adequada?",
      materia: "Cardiologia",
      universidade: "UFRJ",
      ano: "2022",
      dificuldade: "Difícil",
      tempo: "4 min",
      tipo: "Múltipla Escolha",
      alternativas: 4
    },
    {
      id: 4,
      titulo: "Interpretação de gasometria arterial",
      enunciado: "Paciente com dispneia apresenta gasometria arterial: pH = 7.28, PaCO2 = 55 mmHg, HCO3- = 24 mEq/L, PaO2 = 65 mmHg. Qual o diagnóstico mais provável?",
      materia: "Pneumologia",
      universidade: "UFMG",
      ano: "2023",
      dificuldade: "Médio",
      tempo: "3 min",
      tipo: "Múltipla Escolha",
      alternativas: 4
    },
    {
      id: 5,
      titulo: "Síndrome coronariana aguda sem supra ST",
      enunciado: "Homem de 52 anos, tabagista, com dor precordial há 1 hora. ECG sem alterações do segmento ST. Troponina I elevada (0,8 ng/mL). Qual a classificação e conduta inicial?",
      materia: "Cardiologia",
      universidade: "USP",
      ano: "2023",
      dificuldade: "Médio",
      tempo: "3 min",
      tipo: "Múltipla Escolha",
      alternativas: 5
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Simular carregamento
      setTimeout(() => {
        setQuestoes(questoesExemplo.slice(0, Math.min(questionCount, 20)));
        setLoading(false);
      }, 800);
    }
  }, [isOpen, questionCount]);

  const getDificuldadeColor = (dificuldade) => {
    switch (dificuldade) {
      case 'Fácil':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'Médio':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Difícil':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleNavigateToQuestion = (questaoId) => {
    onClose();
    if (onNavigateToResolver) {
      onNavigateToResolver(questaoId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="questoes-modal-content p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Visualizar Questões
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {questionCount} {questionCount === 1 ? 'questão encontrada' : 'questões encontradas'} com os filtros aplicados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Filtros Aplicados */}
        {(filtros.selectedFilters?.length > 0 || filtros.selectedSubFilters?.length > 0) && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtros Aplicados
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filtros.selectedFilters?.map((filter, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {filter.replace('ClinicaMedica', 'Clínica Médica')}
                </Badge>
              ))}
              {filtros.selectedSubFilters?.slice(0, 5).map((subFilter, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {subFilter.split('_').pop() || subFilter}
                </Badge>
              ))}
              {filtros.selectedSubFilters?.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{filtros.selectedSubFilters.length - 5} mais
                </Badge>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Lista de Questões */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="modal-scroll-area px-6">
            {loading ? (
              <div className="space-y-4 py-4">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-200 dark:bg-gray-700 h-32 rounded-lg mb-4"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {questoes.map((questao, index) => (
                  <div
                    key={questao.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all duration-300 cursor-pointer group"
                    onClick={() => handleNavigateToQuestion(questao.id)}
                  >
                    {/* Header da Questão */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          #{index + 1}
                        </span>
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {questao.materia}
                        </Badge>
                        <Badge className={getDificuldadeColor(questao.dificuldade)}>
                          {questao.dificuldade}
                        </Badge>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 transition-colors" />
                    </div>

                    {/* Título */}
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors">
                      {questao.titulo}
                    </h3>

                    {/* Enunciado */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {questao.enunciado}
                    </p>

                    {/* Metadados */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {questao.universidade} {questao.ano}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {questao.tempo}
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {questao.alternativas} alternativas
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {questoes.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <BookOpen className="w-16 h-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Nenhuma questão encontrada
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tente ajustar os filtros para encontrar questões
                    </p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator />

        {/* Footer */}
        <div className="p-6 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {Math.min(questoes.length, 20)} de {questionCount} questões
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {questoes.length > 0 && (
                <Button onClick={() => handleNavigateToQuestion(questoes[0].id)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Começar a Resolver
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VisualizarQuestoesModal;

