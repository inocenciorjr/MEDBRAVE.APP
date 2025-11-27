'use client';

import React, { useState, useEffect } from 'react';
import { AdminModal } from '@/components/admin/ui/AdminModal';
import { AdminButton } from '@/components/admin/ui/AdminButton';
import { AdminInput, AdminTextarea, AdminSelect } from '@/components/admin/ui/AdminInput';
import { AdminBadge } from '@/components/admin/ui/AdminBadge';
import { Question } from '@/types/admin/question';
import Checkbox from '@/components/ui/Checkbox';
import { useToast } from '@/lib/contexts/ToastContext';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  onSave: (questionId: string, updates: Partial<Question>) => Promise<void>;
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  onSave,
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Question>>({});

  useEffect(() => {
    if (question) {
      setFormData({
        statement: question.statement,
        description: question.description,
        alternatives: question.alternatives,
        tags: question.tags,
        status: question.status,
        difficulty: question.difficulty,
        isAnnulled: question.isAnnulled,
        isOutdated: question.isOutdated,
        annulmentReason: question.annulmentReason
      });
    }
  }, [question]);

  if (!question) return null;

  const handleSave = async () => {
    // Validação
    if (!formData.statement?.trim()) {
      toast.warning('O enunciado é obrigatório');
      return;
    }

    const correctAlternatives = formData.alternatives?.filter(a => a.isCorrect) || [];
    if (correctAlternatives.length === 0) {
      toast.warning('Pelo menos uma alternativa deve estar marcada como correta');
      return;
    }

    // Se não é anulada/desatualizada, só pode ter uma correta
    if (!formData.isAnnulled && !formData.isOutdated && correctAlternatives.length > 1) {
      toast.warning('Questões normais só podem ter uma alternativa correta. Marque como anulada ou desatualizada para permitir múltiplas respostas.');
      return;
    }

    setSaving(true);
    try {
      await onSave(question.id, formData);
      onClose();
    } catch (error) {
      console.error('Error saving question:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAlternativeChange = (index: number, field: 'text' | 'isCorrect' | 'explanation', value: string | boolean) => {
    const alternatives = [...(formData.alternatives || [])];
    alternatives[index] = { ...alternatives[index], [field]: value };
    setFormData({ ...formData, alternatives });
  };

  const addAlternative = () => {
    const alternatives = [...(formData.alternatives || [])];
    alternatives.push({
      id: `temp-${Date.now()}`,
      text: '',
      isCorrect: false,
      order: alternatives.length
    });
    setFormData({ ...formData, alternatives });
  };

  const removeAlternative = (index: number) => {
    const alternatives = [...(formData.alternatives || [])];
    alternatives.splice(index, 1);
    setFormData({ ...formData, alternatives });
  };

  const handleTagChange = (index: number, value: string) => {
    const tags = [...(formData.tags || [])];
    tags[index] = value;
    setFormData({ ...formData, tags });
  };

  const addTag = () => {
    const tags = [...(formData.tags || []), ''];
    setFormData({ ...formData, tags });
  };

  const removeTag = (index: number) => {
    const tags = [...(formData.tags || [])];
    tags.splice(index, 1);
    setFormData({ ...formData, tags });
  };

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <AdminButton variant="outline" onClick={onClose} disabled={saving}>
        Cancelar
      </AdminButton>
      <AdminButton onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar Alterações'}
      </AdminButton>
    </div>
  );

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Questão"
      subtitle={`ID: ${question.id.slice(-8)}`}
      size="xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Enunciado */}
        <div>
          <AdminTextarea
            label="Enunciado *"
            value={formData.statement || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              setFormData({ ...formData, statement: e.target.value })
            }
            rows={4}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <AdminTextarea
            label="Descrição/Contexto"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>

        {/* Alternativas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Alternativas *
            </label>
            <AdminButton size="sm" variant="outline" onClick={addAlternative}>
              <span className="material-symbols-outlined text-sm mr-1">add</span>
              Adicionar
            </AdminButton>
          </div>
          <div className="space-y-3">
            {formData.alternatives?.map((alt, index) => (
              <div key={index} className="bg-background-light dark:bg-background-dark rounded-lg p-4 border border-border-light dark:border-border-dark">
                <div className="flex items-start gap-3">
                  <div className="mt-3">
                    <Checkbox
                      checked={alt.isCorrect}
                      onChange={(e) => handleAlternativeChange(index, 'isCorrect', e.target.checked)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <AdminInput
                      placeholder={`Alternativa ${String.fromCharCode(65 + index)}`}
                      value={alt.text}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleAlternativeChange(index, 'text', e.target.value)
                      }
                    />
                    <AdminInput
                      placeholder="Explicação (opcional)"
                      value={alt.explanation || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleAlternativeChange(index, 'explanation', e.target.value)
                      }
                    />
                  </div>
                  <button
                    onClick={() => removeAlternative(index)}
                    className="mt-3 text-red-600 hover:text-red-700"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              Tags
            </label>
            <AdminButton size="sm" variant="outline" onClick={addTag}>
              <span className="material-symbols-outlined text-sm mr-1">add</span>
              Adicionar
            </AdminButton>
          </div>
          <div className="space-y-2">
            {formData.tags?.map((tag, index) => (
              <div key={index} className="flex items-center gap-2">
                <AdminInput
                  placeholder="Tag"
                  value={tag}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleTagChange(index, e.target.value)
                  }
                />
                <button
                  onClick={() => removeTag(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Status e Dificuldade */}
        <div className="grid grid-cols-2 gap-4">
          <AdminSelect
            label="Status"
            value={formData.status || 'DRAFT'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              setFormData({ ...formData, status: e.target.value as any })
            }
            options={[
              { value: 'PUBLISHED', label: 'Publicado' },
              { value: 'DRAFT', label: 'Rascunho' },
              { value: 'ARCHIVED', label: 'Arquivado' }
            ]}
          />
          <AdminSelect
            label="Dificuldade"
            value={formData.difficulty || 'MEDIUM'}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
              setFormData({ ...formData, difficulty: e.target.value as any })
            }
            options={[
              { value: 'EASY', label: 'Fácil' },
              { value: 'MEDIUM', label: 'Médio' },
              { value: 'HARD', label: 'Difícil' }
            ]}
          />
        </div>

        {/* Flags Especiais */}
        <div className="bg-background-light dark:bg-background-dark rounded-lg p-4">
          <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            Flags Especiais
          </h4>
          <div className="space-y-3">
            <Checkbox
              checked={formData.isAnnulled || false}
              onChange={(e) => setFormData({ ...formData, isAnnulled: e.target.checked })}
              label="Questão Anulada (permite múltiplas respostas corretas)"
            />
            <Checkbox
              checked={formData.isOutdated || false}
              onChange={(e) => setFormData({ ...formData, isOutdated: e.target.checked })}
              label="Questão Desatualizada (permite múltiplas respostas corretas)"
            />
          </div>
          {(formData.isAnnulled || formData.isOutdated) && (
            <div className="mt-3">
              <AdminTextarea
                label="Motivo"
                value={formData.annulmentReason || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                  setFormData({ ...formData, annulmentReason: e.target.value })
                }
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Info de Filtros */}
        <div className="bg-primary/5 rounded-lg p-4">
          <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined">filter_alt</span>
            Filtros Associados
          </h4>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {question.filterIds?.length || 0} filtro(s) e {question.subFilterIds?.length || 0} subfiltro(s) associados.
            Use a edição em lote para modificar filtros de múltiplas questões.
          </p>
        </div>
      </div>
    </AdminModal>
  );
};

export default QuestionModal;
