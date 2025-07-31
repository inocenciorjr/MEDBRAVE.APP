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
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUserFolders, 
  createFolder,
  createQuestionList,
  saveQuestionsToList
} from '../../services/questionListService';
import { getQuestionsForList } from '../../services/questionService';

const CriarListaModalSimple = ({ 
  isOpen, 
  onClose, 
  questionCount = 0, 
  filtros = {}
}) => {
  const { user, isAuthenticated } = useAuth();
  const [nomeList, setNomeLista] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para pastas
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loadingFolders, setLoadingFolders] = useState(false);

  console.log('CriarListaModalSimple renderizando:', { isOpen, questionCount, isAuthenticated });

  // Teste 1: Adicionar useEffect simples
  useEffect(() => {
    console.log('useEffect executado - modal aberto:', isOpen);
  }, [isOpen]);

  // Teste 2: Adicionar useEffect que tenta carregar pastas
  useEffect(() => {
    const testLoadFolders = async () => {
      if (isOpen && isAuthenticated) {
        try {
          setLoadingFolders(true);
          console.log('Tentando carregar pastas...');
          const foldersData = await getUserFolders();
          console.log('Pastas carregadas com sucesso:', foldersData);
          setFolders(Array.isArray(foldersData) ? foldersData : []);
        } catch (error) {
          console.error('Erro ao carregar pastas:', error);
          setFolders([]);
        } finally {
          setLoadingFolders(false);
        }
      }
    };

    testLoadFolders();
  }, [isOpen, isAuthenticated]);

  // Se não estiver autenticado, não renderizar
  if (!isAuthenticated) {
    console.log('Usuário não autenticado');
    return null;
  }

  const handleSave = () => {
    console.log('Salvando lista:', nomeList);
    onClose();
  };

  const handleClose = () => {
    setNomeLista('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Lista de Questões (Debug)</DialogTitle>
          <DialogDescription>
            Versão simplificada para debug
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-lista">Nome da Lista</Label>
            <Input
              id="nome-lista"
              placeholder="Digite o nome da lista"
              value={nomeList}
              onChange={(e) => setNomeLista(e.target.value)}
            />
          </div>

          {/* Teste 3: Componente simples sem Select */}
          <div className="space-y-2">
            <Label>Pasta (Teste)</Label>
            {loadingFolders ? (
              <div className="p-2 text-sm text-gray-500">Carregando pastas...</div>
            ) : (
              <div className="p-2 border rounded">
                <p className="text-sm">Pastas carregadas: {folders.length}</p>
                {folders.map((folder, index) => (
                  <div key={folder.id || index} className="text-xs">
                    - {folder.name || 'Sem nome'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <strong>Questões disponíveis:</strong> {questionCount}
            </p>
            <p className="text-sm">
              <strong>Pastas carregadas:</strong> {folders.length}
            </p>
            <p className="text-sm">
              <strong>Pasta selecionada:</strong> {selectedFolderId || 'Nenhuma'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!nomeList.trim() || loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CriarListaModalSimple; 