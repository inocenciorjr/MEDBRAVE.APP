import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Play, 
  Save, 
  BookOpen, 
  AlertCircle,
  CheckCircle,
  Filter,
  Hash,
  Folder,
  Plus,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUserFolders, 
  createFolder,
  createQuestionList,
  saveQuestionsToList
} from '../../services/questionListService';
import { getQuestionsForList } from '../../services/questionService';
import FolderModal from './FolderModal';

const CriarListaModal = ({ 
  isOpen, 
  onClose, 
  questionCount = 0, 
  filtros = {}
}) => {
  const { user, isAuthenticated } = useAuth();
  const [nomeList, setNomeLista] = useState('');
  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState(Math.min(questionCount, 20));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Debug logs (remover em produção)
  // console.log('CriarListaModal props:', { isOpen, questionCount, filtros, isAuthenticated });
  
  // Estados para pastas (temporariamente desabilitado para debug)
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  const maxQuestoes = Math.min(questionCount, 200);

  // Se não estiver autenticado, não renderizar o modal
  if (!isAuthenticated) {
    return null;
  }

  // Carregar pastas quando o modal abre
  useEffect(() => {
    const loadFoldersEffect = async () => {
      try {
        if (isOpen && isAuthenticated) {
          await loadFolders();
        }
      } catch (error) {
        console.error('Erro no useEffect loadFolders:', error);
        setFolders([]);
      }
    };

    loadFoldersEffect();
  }, [isOpen, isAuthenticated]);

  const loadFolders = async () => {
    try {
      setLoadingFolders(true);
      
      // Verificar se o usuário ainda está autenticado
      if (!isAuthenticated || !user) {
        setFolders([]);
        return;
      }
      
      const foldersData = await getUserFolders();
      
      // Verificar se os dados são válidos
      if (Array.isArray(foldersData)) {
        setFolders(foldersData);
      } else {
        console.warn('getUserFolders retornou dados inválidos:', foldersData);
        setFolders([]);
      }
    } catch (error) {
      console.error('Erro ao carregar pastas:', error);
      setFolders([]); // Fallback para array vazio
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleCreateFolder = async (folderData) => {
    try {
      const folderId = await createFolder({
        ...folderData,
        order: folders.length
      });
      await loadFolders(); // Recarregar lista de pastas
      setSelectedFolderId(folderId); // Selecionar a pasta recém-criada
      setFolderModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!nomeList.trim()) {
      newErrors.nome = 'Nome da lista é obrigatório';
    } else if (nomeList.trim().length < 3) {
      newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
    } else if (nomeList.trim().length > 50) {
      newErrors.nome = 'Nome deve ter no máximo 50 caracteres';
    }

    if (!quantidadeQuestoes || quantidadeQuestoes < 1) {
      newErrors.quantidade = 'Quantidade deve ser pelo menos 1';
    } else if (quantidadeQuestoes > maxQuestoes) {
      newErrors.quantidade = `Quantidade não pode exceder ${maxQuestoes}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAndRespond = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Buscar questões filtradas ordenadas por ano (mais recentes primeiro)
      const questions = await getQuestionsForList(filtros, quantidadeQuestoes);
      
      if (questions.length === 0) {
        throw new Error('Nenhuma questão encontrada com os filtros aplicados');
      }

      // 2. Criar a lista
      const listaData = {
        name: nomeList.trim(),
        description: `Lista criada a partir de ${questions.length} questões filtradas`,
        folderId: selectedFolderId || null,
        isPublic: false,
        tags: []
      };

      const listId = await createQuestionList(listaData);
      
      // 3. Salvar questões na lista
      await saveQuestionsToList(listId, questions);
      
      // 4. Redirecionar para página de resolver questões
      onClose();
      resetForm();
      
      // Por enquanto, redirecionar para dashboard (até criar a página de resolver)
      // TODO: Criar página de resolver questões em /resolver
      window.location.href = `/dashboard?listId=${listId}`;
      
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      alert(`Erro ao criar lista: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Buscar questões filtradas ordenadas por ano (mais recentes primeiro)
      const questions = await getQuestionsForList(filtros, quantidadeQuestoes);
      
      if (questions.length === 0) {
        throw new Error('Nenhuma questão encontrada com os filtros aplicados');
      }

      // 2. Criar a lista
      const listaData = {
        name: nomeList.trim(),
        description: `Lista criada a partir de ${questions.length} questões filtradas`,
        folderId: selectedFolderId || null,
        isPublic: false,
        tags: []
      };

      const listId = await createQuestionList(listaData);
      
      // 3. Salvar questões na lista
      await saveQuestionsToList(listId, questions);
      
      // 4. Redirecionar para página de listas de questões
      onClose();
      resetForm();
      
      // Redirecionar para dashboard
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      alert(`Erro ao criar lista: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNomeLista('');
    setQuantidadeQuestoes(Math.min(questionCount, 20));
    setSelectedFolderId('');
    setErrors({});
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleQuantidadeChange = (value) => {
    const num = parseInt(value) || 0;
    setQuantidadeQuestoes(Math.min(Math.max(num, 0), maxQuestoes));
    if (errors.quantidade) {
      setErrors(prev => ({ ...prev, quantidade: '' }));
    }
  };

  const getTempoEstimado = () => {
    return Math.round(quantidadeQuestoes * 3); // 3 minutos por questão
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="lista-modal-content">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                Criar Lista de Questões
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Configure sua lista personalizada de questões para estudo
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
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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

          {/* Configurações da Lista */}
          <div className="space-y-4">
            {/* Nome da Lista */}
            <div className="space-y-2">
              <Label htmlFor="nome-lista" className="text-sm font-medium">
                Nome da Lista *
              </Label>
              <Input
                id="nome-lista"
                placeholder="Ex: Cardiologia - Revisão Final"
                value={nomeList}
                onChange={(e) => {
                  setNomeLista(e.target.value);
                  if (errors.nome) {
                    setErrors(prev => ({ ...prev, nome: '' }));
                  }
                }}
                className={errors.nome ? 'border-red-500 focus:border-red-500' : ''}
                maxLength={50}
              />
              {errors.nome && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {errors.nome}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {nomeList.length}/50 caracteres
              </div>
            </div>

            {/* Seleção de Pasta - Versão Alternativa */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Organizar em Pasta
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  {loadingFolders ? (
                    <div className="p-2 border rounded text-sm text-gray-500">
                      Carregando pastas...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto border rounded p-2">
                        <label className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="radio"
                            name="folder"
                            value=""
                            checked={selectedFolderId === ''}
                            onChange={(e) => setSelectedFolderId(e.target.value)}
                            className="w-3 h-3"
                          />
                          <div className="w-4 h-4 rounded bg-gray-300"></div>
                          <span className="text-sm">Nenhuma pasta (raiz)</span>
                        </label>
                        {Array.isArray(folders) && folders.map((folder) => {
                          if (!folder || !folder.id) return null;
                          
                          const getIconEmoji = (iconType) => {
                            const iconMap = {
                              folder: '📁', book: '📚', medical: '🏥', heart: '❤️',
                              brain: '🧠', star: '⭐', target: '🎯', trophy: '🏆'
                            };
                            return iconMap[iconType] || '📁';
                          };
                          
                          return (
                            <label key={folder.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="radio"
                                name="folder"
                                value={folder.id}
                                checked={selectedFolderId === folder.id}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                className="w-3 h-3"
                              />
                              <div 
                                className="w-4 h-4 rounded text-xs flex items-center justify-center"
                                style={{ backgroundColor: folder.color || '#gray' }}
                              >
                                {getIconEmoji(folder.icon)}
                              </div>
                              <span className="text-sm flex-1">{folder.name || 'Pasta sem nome'}</span>
                              <span className="text-xs bg-gray-100 px-1 rounded">
                                {folder.listCount || 0}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setFolderModalOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Nova Pasta
                </Button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Organize sua lista em uma pasta para facilitar a navegação
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
                    onClick={() => handleQuantidadeChange(Math.min(questionCount, 10))}
                    disabled={loading}
                  >
                    10
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantidadeChange(Math.min(questionCount, 25))}
                    disabled={loading}
                  >
                    25
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantidadeChange(Math.min(questionCount, 50))}
                    disabled={loading}
                  >
                    50
                  </Button>
                </div>
              </div>
              {errors.quantidade && (
                <div className="flex items-center gap-1 text-red-600 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {errors.quantidade}
                </div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Máximo: {maxQuestoes} questões
              </div>
            </div>
          </div>

          {/* Informações da Lista */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Resumo da Lista
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {quantidadeQuestoes}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Questões
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {getTempoEstimado()} min
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Tempo Estimado
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {Math.round((quantidadeQuestoes / questionCount) * 100)}%
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  do Total
                </div>
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
              disabled={loading || !nomeList.trim() || quantidadeQuestoes < 1}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
            
            <Button
              onClick={handleSaveAndRespond}
              disabled={loading || !nomeList.trim() || quantidadeQuestoes < 1}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {loading ? 'Criando...' : 'Salvar e Responder'}
            </Button>
          </div>
          
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
      
      {/* Modal de Criação de Pasta */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSave={handleCreateFolder}
      />
    </Dialog>
  );
};

export default CriarListaModal;

