'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SelectedQuestion } from '@/app/mentor/simulados/criar/page';

interface QuestionSearchPanelProps {
  onAddQuestion: (question: SelectedQuestion) => void;
}

interface SearchFilters {
  query: string;
  specialty: string;
  university: string;
  year: string;
  searchBy: 'enunciado' | 'id';
}

interface QuestionResult {
  id: string;
  enunciado: string;
  specialty?: string;
  university?: string;
  year?: number;
}

export default function QuestionSearchPanel({ onAddQuestion }: QuestionSearchPanelProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    specialty: '',
    university: '',
    year: '',
    searchBy: 'enunciado',
  });
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom question state
  const [customQuestion, setCustomQuestion] = useState({
    enunciado: '',
    alternatives: [
      { id: '1', text: '', isCorrect: true },
      { id: '2', text: '', isCorrect: false },
      { id: '3', text: '', isCorrect: false },
      { id: '4', text: '', isCorrect: false },
      { id: '5', text: '', isCorrect: false },
    ],
  });

  // Buscar questões
  const searchQuestions = async () => {
    if (!filters.query || filters.query.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // TODO: Implementar busca real na API
      // Simulando resultados vazios por enquanto
      setResults([]);
    } catch (error) {
      console.error('Erro ao buscar questões:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce da busca
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchQuestions();
    }, 500);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [filters.query]);

  const handleAddFromBank = (question: QuestionResult) => {
    onAddQuestion({
      id: question.id,
      type: 'bank',
      enunciado: question.enunciado,
      specialty: question.specialty,
      university: question.university,
      year: question.year,
    });
  };

  const handleAddCustom = () => {
    if (!customQuestion.enunciado.trim()) return;
    
    const hasCorrect = customQuestion.alternatives.some(a => a.isCorrect && a.text.trim());
    if (!hasCorrect) return;

    onAddQuestion({
      id: `custom-${Date.now()}`,
      type: 'custom',
      enunciado: customQuestion.enunciado,
      alternatives: customQuestion.alternatives.filter(a => a.text.trim()),
    });

    // Reset form
    setCustomQuestion({
      enunciado: '',
      alternatives: [
        { id: '1', text: '', isCorrect: true },
        { id: '2', text: '', isCorrect: false },
        { id: '3', text: '', isCorrect: false },
        { id: '4', text: '', isCorrect: false },
        { id: '5', text: '', isCorrect: false },
      ],
    });
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-2xl overflow-hidden
      border border-border-light dark:border-border-dark
      shadow-lg dark:shadow-dark-lg h-fit">
      {/* Tabs */}
      <div className="flex border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all duration-200
            ${activeTab === 'search'
              ? 'bg-primary/5 dark:bg-primary/10 text-primary border-b-2 border-primary -mb-px'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
            }`}
        >
          <span className="material-symbols-outlined text-lg">search</span>
          Buscar no Banco
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-medium transition-all duration-200
            ${activeTab === 'custom'
              ? 'bg-primary/5 dark:bg-primary/10 text-primary border-b-2 border-primary -mb-px'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-background-light dark:hover:bg-background-dark'
            }`}
        >
          <span className="material-symbols-outlined text-lg">edit</span>
          Questão Autoral
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {activeTab === 'search' ? (
          <div className="space-y-4">
            {/* Search input */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={filters.searchBy}
                  onChange={(e) => setFilters(f => ({ ...f, searchBy: e.target.value as 'enunciado' | 'id' }))}
                  className="px-3 py-2.5 bg-background-light dark:bg-background-dark
                    border border-border-light dark:border-border-dark rounded-xl
                    text-text-light-primary dark:text-text-dark-primary text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="enunciado">Enunciado</option>
                  <option value="id">ID</option>
                </select>
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                    text-text-light-secondary dark:text-text-dark-secondary">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder={filters.searchBy === 'id' ? 'Digite o ID da questão...' : 'Buscar por enunciado...'}
                    value={filters.query}
                    onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-background-light dark:bg-background-dark
                      border border-border-light dark:border-border-dark rounded-xl
                      text-text-light-primary dark:text-text-dark-primary
                      placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                      focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary
                  hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                Filtros avançados
                <span className={`material-symbols-outlined text-lg transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {/* Advanced filters */}
              {showFilters && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-background-light dark:bg-background-dark rounded-xl">
                  <select
                    value={filters.specialty}
                    onChange={(e) => setFilters(f => ({ ...f, specialty: e.target.value }))}
                    className="px-3 py-2 bg-surface-light dark:bg-surface-dark
                      border border-border-light dark:border-border-dark rounded-lg
                      text-text-light-primary dark:text-text-dark-primary text-sm"
                  >
                    <option value="">Especialidade</option>
                    <option value="cardiologia">Cardiologia</option>
                    <option value="pneumologia">Pneumologia</option>
                    <option value="neurologia">Neurologia</option>
                  </select>
                  <select
                    value={filters.university}
                    onChange={(e) => setFilters(f => ({ ...f, university: e.target.value }))}
                    className="px-3 py-2 bg-surface-light dark:bg-surface-dark
                      border border-border-light dark:border-border-dark rounded-lg
                      text-text-light-primary dark:text-text-dark-primary text-sm"
                  >
                    <option value="">Universidade</option>
                    <option value="usp">USP</option>
                    <option value="unicamp">UNICAMP</option>
                  </select>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters(f => ({ ...f, year: e.target.value }))}
                    className="px-3 py-2 bg-surface-light dark:bg-surface-dark
                      border border-border-light dark:border-border-dark rounded-lg
                      text-text-light-primary dark:text-text-dark-primary text-sm"
                  >
                    <option value="">Ano</option>
                    {[2024, 2023, 2022, 2021, 2020].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">
                    {filters.query ? 'search_off' : 'search'}
                  </span>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {filters.query 
                      ? 'Nenhuma questão encontrada'
                      : 'Digite para buscar questões'
                    }
                  </p>
                </div>
              ) : (
                results.map((question) => (
                  <div
                    key={question.id}
                    className="p-4 bg-background-light dark:bg-background-dark rounded-xl
                      border border-border-light dark:border-border-dark
                      hover:border-primary/30 transition-all duration-200 group"
                  >
                    <p className="text-sm text-text-light-primary dark:text-text-dark-primary line-clamp-3 mb-3">
                      {question.enunciado}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {question.specialty && <span>{question.specialty}</span>}
                        {question.university && <span>• {question.university}</span>}
                        {question.year && <span>• {question.year}</span>}
                      </div>
                      <button
                        onClick={() => handleAddFromBank(question)}
                        className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium
                          opacity-0 group-hover:opacity-100 transition-all duration-200
                          hover:bg-primary/90"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enunciado */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Enunciado da Questão
              </label>
              <textarea
                value={customQuestion.enunciado}
                onChange={(e) => setCustomQuestion(q => ({ ...q, enunciado: e.target.value }))}
                placeholder="Digite o enunciado da questão..."
                rows={4}
                className="w-full px-4 py-3 bg-background-light dark:bg-background-dark
                  border border-border-light dark:border-border-dark rounded-xl
                  text-text-light-primary dark:text-text-dark-primary
                  placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  resize-none"
              />
            </div>

            {/* Alternativas */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                Alternativas
              </label>
              <div className="space-y-2">
                {customQuestion.alternatives.map((alt, index) => (
                  <div key={alt.id} className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCustomQuestion(q => ({
                          ...q,
                          alternatives: q.alternatives.map((a, i) => ({
                            ...a,
                            isCorrect: i === index,
                          })),
                        }));
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        transition-all duration-200
                        ${alt.isCorrect
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                        }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </button>
                    <input
                      type="text"
                      value={alt.text}
                      onChange={(e) => {
                        setCustomQuestion(q => ({
                          ...q,
                          alternatives: q.alternatives.map((a, i) => 
                            i === index ? { ...a, text: e.target.value } : a
                          ),
                        }));
                      }}
                      placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-4 py-2.5 bg-background-light dark:bg-background-dark
                        border border-border-light dark:border-border-dark rounded-xl
                        text-text-light-primary dark:text-text-dark-primary
                        placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary
                        focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                Clique na letra para marcar a alternativa correta
              </p>
            </div>

            {/* Add button */}
            <button
              onClick={handleAddCustom}
              disabled={!customQuestion.enunciado.trim() || !customQuestion.alternatives.some(a => a.isCorrect && a.text.trim())}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold
                hover:bg-primary/90 transition-all duration-200
                shadow-lg hover:shadow-xl shadow-primary/30
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Adicionar Questão Autoral
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
