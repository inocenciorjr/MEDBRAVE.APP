import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Button } from '../../../components/ui/button';
import { Plus, Upload, RefreshCw } from 'lucide-react';
import ErrorBoundary from '../../../components/ErrorBoundary';
import MeusFlashcards from './tabs/MeusFlashcards';
import Comunidade from './tabs/Comunidade';
import Biblioteca from './tabs/Biblioteca';
import Estatisticas from './tabs/Estatisticas';
import CreateDeckModal from '../../../components/modals/CreateDeckModal';
import ImportApkgModal from '../../../components/modals/ImportApkgModal';

/**
 * 🎯 PÁGINA PRINCIPAL DE FLASHCARDS
 * 
 * Implementada seguindo as regras rígidas do roteiro:
 * ❌ NUNCA criar header, containers, backgrounds ou faixas
 * ❌ NUNCA criar componentes inline ou estilos inline
 * ❌ NUNCA criar múltiplos sistemas de loading
 * ❌ NUNCA implementar lógica complexa inline
 * 
 * ✅ SEMPRE importar componentes de /components/
 * ✅ SEMPRE usar CSS Variables
 * ✅ SEMPRE usar componentes UI reutilizáveis
 * ✅ SEMPRE usar serviços externos
 * ✅ ESTRUTURA MÍNIMA: ErrorBoundary + Tabs + Componentes importados
 */
const FlashcardsPage = () => {
  const [activeTab, setActiveTab] = useState('meus-flashcards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleImportSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flashcards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seus decks de flashcards e organize seus estudos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importar APKG
            </Button>
            
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Deck
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="meus-flashcards">Meus Flashcards</TabsTrigger>
            <TabsTrigger value="comunidade">Comunidade</TabsTrigger>
            <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
            <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-6">
            <TabsContent value="meus-flashcards" className="h-full">
              <MeusFlashcards key={refreshTrigger} />
            </TabsContent>
            
            <TabsContent value="comunidade" className="h-full">
              <Comunidade />
            </TabsContent>
            
            <TabsContent value="biblioteca" className="h-full">
              <Biblioteca />
            </TabsContent>
            
            <TabsContent value="estatisticas" className="h-full">
              <Estatisticas />
            </TabsContent>
          </div>
        </Tabs>

        {/* Modais */}
        <CreateDeckModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
        
        <ImportApkgModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      </div>
    </ErrorBoundary>
  );
};

export default FlashcardsPage; 