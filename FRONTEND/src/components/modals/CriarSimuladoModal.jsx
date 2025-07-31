import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  RotateCcw, 
  Save, 
  Timer, 
  AlertCircle,
  CheckCircle,
  Filter,
  Trophy,
  Clock
} from 'lucide-react';

const CriarSimuladoModal = ({ 
  isOpen, 
  onClose, 
  questionCount = 0, 
  filtros = {},
  onSaveAndStart,
  onSaveAndClose 
}) => {
  const [nomeSimulado, setNomeSimulado] = useState('');
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState(Math.min(questionCount, 30));
  const [tempoLimite, setTempoLimite] = useState(true);
  const [tempoPersonalizado, setTempoPersonalizado] = useState(90); // minutos
  const [embaralharQuestoes, setEmbaralharQuestoes] = useState(true);
  const [mostrarResultadoImediato, setMostrarResultadoImediato] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const maxQuestoes = Math.min(questionCount, 200);

  const validateForm = () => {
    const newErrors = {};

    if (!nomeSimulado.trim()) {
      newErrors.nome = 'Nome do simulado é obrigatório';
    } else if (nomeSimulado.trim().length < 3) {
      newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
    } else if (nomeSimulado.trim().length > 60) {
      newErrors.nome = 'Nome deve ter no máximo 60 caracteres';
    }

    if (!quantidadeQuestoes || quantidadeQuestoes < 1) {
      newErrors.quantidade = 'Quantidade deve ser pelo menos 1';
    } else if (quantidadeQuestoes > maxQuestoes) {
      newErrors.quantidade = `Quantidade não pode exceder ${maxQuestoes}`;
    }

    if (tempoLimite && (!tempoPersonalizado || tempoPersonalizado < 1)) {
      newErrors.tempo = 'Tempo deve ser pelo menos 1 minuto';
    } else if (tempoLimite && tempoPersonalizado > 300) {
      newErrors.tempo = 'Tempo não pode exceder 300 minutos (5 horas)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAndStart = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const simuladoData = {
        nome: nomeSimulado.trim(),
        quantidade: quantidadeQuestoes,
        tempoLimite: tempoLimite,
        tempoMinutos: tempoLimite ? tempoPersonalizado : null,
        embaralharQuestoes,
        mostrarResultadoImediato,
        filtros: filtros,
        tipo: 'simulado',
        criadoEm: new Date().toISOString()
      };

      await new Promise(resolve => setTimeout(resolve, 1200)); // Simular API call
      
      if (onSaveAndStart) {
        onSaveAndStart(simuladoData);
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const simuladoData = {
        nome: nomeSimulado.trim(),
        quantidade: quantidadeQuestoes,
        tempoLimite: tempoLimite,
        tempoMinutos: tempoLimite ? tempoPersonalizado : null,
        embaralharQuestoes,
        mostrarResultadoImediato,
        filtros: filtros,
        tipo: 'simulado',
        criadoEm: new Date().toISOString()
      };

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular API call
      
      if (onSaveAndClose) {
        onSaveAndClose(simuladoData);
      }
      
      onClose();
      resetForm();
    } catch (error) {
      console.error('Erro ao criar simulado:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNomeSimulado('');
    setQuantidadeQuestoes(Math.min(questionCount, 30));
    setTempoLimite(true);
    setTempoPersonalizado(90);
    setEmbaralharQuestoes(true);
    setMostrarResultadoImediato(false);
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleQuantidadeChange = (value) => {
    const num = parseInt(value) || 0;
    const newQuantidade = Math.min(Math.max(num, 0), maxQuestoes);
    setQuantidadeQuestoes(newQuantidade);
    
    // Ajustar tempo automaticamente baseado na quantidade
    if (tempoLimite) {
      const tempoSugerido = Math.max(30, Math.min(300, newQuantidade * 3));
      setTempoPersonalizado(tempoSugerido);
    }
    
    if (errors.quantidade) {
      setErrors(prev => ({ ...prev, quantidade: '' }));
    }
  };

  const getTempoSugerido = () => {
    return quantidadeQuestoes * 3; // 3 minutos por questão
  };

  const getDificuldadeSimulado = () => {
    if (quantidadeQuestoes <= 20) return { nivel: 'Rápido', cor: 'text-green-600 dark:text-green-400' };
    if (quantidadeQuestoes <= 50) return { nivel: 'Médio', cor: 'text-yellow-600 dark:text-yellow-400' };
    return { nivel: 'Intenso', cor: 'text-red-600 dark:text-red-400' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="simulado-modal-content overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Criar Simulado
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Configure seu simulado personalizado com cronômetro e avaliação
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-6">
          {/* Resumo dos Filtros */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Questões Selecionadas
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {questionCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Disponível
                </div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg border">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {maxQuestoes}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Máximo Permitido
                </div>
              </div>
            </div>

            {(filtros.selectedFilters?.length > 0 || filtros.selectedSubFilters?.length > 0) && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Filtros Aplicados:
                </div>
                <div className="flex flex-wrap gap-1">
                  {filtros.selectedFilters?.slice(0, 3).map((filter, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {filter.replace('ClinicaMedica', 'Clínica Médica')}
                    </Badge>
                  ))}
                  {filtros.selectedSubFilters?.slice(0, 3).map((subFilter, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {subFilter.split('_').pop() || subFilter}
                    </Badge>
                  ))}
                  {(filtros.selectedFilters?.length > 3 || filtros.selectedSubFilters?.length > 3) && (
                    <Badge variant="outline" className="text-xs">
                      +{(filtros.selectedFilters?.length || 0) + (filtros.selectedSubFilters?.length || 0) - 6} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Configurações do Simulado */}
          <div className="space-y-4">
            {/* Nome do Simulado */}
            <div className="space-y-2">
              <Label htmlFor="nome-simulado" className="text-sm font-medium">
                Nome do Simulado *
              </Label>
              <Input
                id="nome-simulado"
                placeholder="Ex: Simulado Cardiologia - Prova Final"
                value={nomeSimulado}
                onChange={(e) => {
                  setNomeSimulado(e.target.value);
                  if (errors.nome) {
                    setErrors(prev => ({ ...prev, nome: '' }));
                  }
                }}
                className={errors.nome ? 'border-red-500 focus:border-red-500' : ''}
                maxLength={60}
              />
              {errors.nome && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {errors.nome}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {nomeSimulado.length}/60 caracteres
              </div>
            </div>

            {/* Quantidade de Questões */}
            <div className="space-y-2">
              <Label htmlFor="quantidade-questoes" className="text-sm font-medium">
                Quantidade de Questões *
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    id="quantidade-questoes"
                    type="number"
                    min="1"
                    max={maxQuestoes}
                    value={quantidadeQuestoes}
                    onChange={(e) => handleQuantidadeChange(e.target.value)}
                    className={errors.quantidade ? 'border-red-500 focus:border-red-500' : ''}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantidadeChange(20)}
                    disabled={loading}
                  >
                    20
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantidadeChange(40)}
                    disabled={loading}
                  >
                    40
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantidadeChange(60)}
                    disabled={loading}
                  >
                    60
                  </Button>
                </div>
              </div>
              {errors.quantidade && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {errors.quantidade}
                </div>
              )}
            </div>

            {/* Configurações de Tempo */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tempo-limite"
                  checked={tempoLimite}
                  onCheckedChange={setTempoLimite}
                />
                <Label htmlFor="tempo-limite" className="text-sm font-medium">
                  Definir tempo limite
                </Label>
              </div>
              
              {tempoLimite && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="tempo-personalizado" className="text-sm">
                    Tempo em minutos
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="tempo-personalizado"
                      type="number"
                      min="1"
                      max="300"
                      value={tempoPersonalizado}
                      onChange={(e) => {
                        setTempoPersonalizado(parseInt(e.target.value) || 0);
                        if (errors.tempo) {
                          setErrors(prev => ({ ...prev, tempo: '' }));
                        }
                      }}
                      className={`w-24 ${errors.tempo ? 'border-red-500 focus:border-red-500' : ''}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTempoPersonalizado(getTempoSugerido())}
                      disabled={loading}
                    >
                      Sugerido: {getTempoSugerido()}min
                    </Button>
                  </div>
                  {errors.tempo && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {errors.tempo}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opções Avançadas */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Opções do Simulado</h4>
              
              <div className="space-y-3 ml-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="embaralhar"
                    checked={embaralharQuestoes}
                    onCheckedChange={setEmbaralharQuestoes}
                  />
                  <Label htmlFor="embaralhar" className="text-sm">
                    Embaralhar ordem das questões
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="resultado-imediato"
                    checked={mostrarResultadoImediato}
                    onCheckedChange={setMostrarResultadoImediato}
                  />
                  <Label htmlFor="resultado-imediato" className="text-sm">
                    Mostrar resultado após cada questão
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo do Simulado */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Resumo do Simulado
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center mb-3">
              <div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {quantidadeQuestoes}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  Questões
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {tempoLimite ? `${tempoPersonalizado}min` : 'Sem limite'}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  Tempo
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-sm font-medium ${getDificuldadeSimulado().cor}`}>
                Nível: {getDificuldadeSimulado().nivel}
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                {embaralharQuestoes ? 'Questões embaralhadas' : 'Ordem original'} • 
                {mostrarResultadoImediato ? ' Resultado imediato' : ' Resultado no final'}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Botões de Ação */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleSaveAndClose}
              disabled={loading || !nomeSimulado.trim() || quantidadeQuestoes < 1}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
            
            <Button
              onClick={handleSaveAndStart}
              disabled={loading || !nomeSimulado.trim() || quantidadeQuestoes < 1}
              className="flex items-center gap-2"
            >
              <Timer className="w-4 h-4" />
              {loading ? 'Criando...' : 'Salvar e Iniciar'}
            </Button>
          </div>
          
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CriarSimuladoModal;

