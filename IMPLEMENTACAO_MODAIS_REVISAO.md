# Implementação dos Modais de Revisão

## ✅ Componentes Criados

### 1. ReviewInfoModal
**Arquivo:** `frontend/components/reviews/ReviewInfoModal.tsx`

**Funcionalidade:**
- Modal informativo sobre o sistema de revisão
- Explica algoritmo FSRS, botões, threshold e modos de estudo
- Aparece quando usuário clica no ícone de interrogação

### 2. DeleteSuggestionModal
**Arquivo:** `frontend/components/reviews/DeleteSuggestionModal.tsx`

**Funcionalidade:**
- Sugere exclusão após 3x EASY ou GOOD seguidas
- Permite excluir ou manter a revisão
- Aparece automaticamente após detectar sequência

---

## 🔧 Como Integrar

### **1. Adicionar botão de interrogação nos componentes de avaliação:**

#### **DifficultyButtons.tsx (Flashcards):**

```typescript
import { HelpCircle } from 'lucide-react';
import { ReviewInfoModal } from '@/components/reviews/ReviewInfoModal';

export function DifficultyButtons({ onSelect, flashcardId }: DifficultyButtonsProps) {
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // ... resto do código
  
  return (
    <div className="w-full space-y-2">
      {/* Botão de ajuda */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowInfoModal(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2"
          title="Como funciona o sistema de revisão?"
        >
          <HelpCircle size={20} />
        </button>
      </div>
      
      {/* Preview text */}
      <div className="text-center">
        {/* ... */}
      </div>
      
      {/* Botões */}
      <footer className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* ... */}
      </footer>
      
      {/* Modal de informação */}
      <ReviewInfoModal 
        isOpen={showInfoModal} 
        onClose={() => setShowInfoModal(false)} 
      />
    </div>
  );
}
```

#### **ReviewButtons.tsx (Caderno de Erros):**

Adicionar o mesmo padrão acima.

---

### **2. Detectar sequência de 3x EASY/GOOD e mostrar sugestão:**

#### **Lógica de detecção:**

Precisamos:
1. Buscar histórico de revisões do card
2. Verificar se as últimas 3 respostas foram EASY (3) ou GOOD (2)
3. Mostrar modal de sugestão

#### **Criar endpoint para verificar sequência:**

**Backend:** `BACKEND/src/domain/studyTools/unifiedReviews/controllers/UnifiedReviewController.ts`

```typescript
async checkConsecutiveGoodResponses(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { contentId, contentType } = req.params;
    
    // Buscar últimas 3 revisões
    const { data: reviews, error } = await this.supabase
      .from('review_history')
      .select('grade')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType)
      .order('reviewed_at', { ascending: false })
      .limit(3);
    
    if (error) throw error;
    
    // Verificar se todas são GOOD (2) ou EASY (3)
    const allGoodOrEasy = reviews?.length === 3 && 
      reviews.every(r => r.grade === 2 || r.grade === 3);
    
    const consecutiveEasy = reviews?.length === 3 && 
      reviews.every(r => r.grade === 3);
    
    res.json({
      success: true,
      data: {
        shouldSuggestDelete: allGoodOrEasy,
        consecutiveCount: reviews?.length || 0,
        grade: consecutiveEasy ? 'easy' : 'good',
      },
    });
  } catch (error) {
    // ... error handling
  }
}
```

#### **Adicionar rota:**

```typescript
router.get(
  '/unified-reviews/check-sequence/:contentType/:contentId',
  authMiddleware,
  (req, res) => unifiedReviewController.checkConsecutiveGoodResponses(req, res)
);
```

#### **Frontend - Após responder:**

```typescript
import { DeleteSuggestionModal } from '@/components/reviews/DeleteSuggestionModal';

export function DifficultyButtons({ onSelect, flashcardId }: DifficultyButtonsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    consecutiveCount: number;
    grade: 'good' | 'easy';
  } | null>(null);
  
  const handleSelect = async (difficulty: Difficulty) => {
    // Registrar resposta
    await onSelect(difficulty);
    
    // Se foi GOOD ou EASY, verificar sequência
    if (difficulty === 'good' || difficulty === 'easy') {
      const response = await fetchWithAuth(
        `/api/unified-reviews/check-sequence/FLASHCARD/${flashcardId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data.shouldSuggestDelete) {
          setDeleteInfo({
            consecutiveCount: data.data.consecutiveCount,
            grade: data.data.grade,
          });
          setShowDeleteModal(true);
        }
      }
    }
  };
  
  const handleDelete = async () => {
    // Excluir card FSRS
    await fetchWithAuth(
      `/api/unified-reviews/FLASHCARD/${flashcardId}`,
      { method: 'DELETE' }
    );
    
    setShowDeleteModal(false);
    // Ir para próximo card
  };
  
  return (
    <>
      {/* ... botões ... */}
      
      {/* Modal de sugestão de exclusão */}
      {deleteInfo && (
        <DeleteSuggestionModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDelete}
          consecutiveCount={deleteInfo.consecutiveCount}
          grade={deleteInfo.grade}
        />
      )}
    </>
  );
}
```

---

### **3. Criar endpoint de exclusão:**

**Backend:**

```typescript
async deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { contentId, contentType } = req.params;
    
    // Excluir card FSRS
    const { error } = await this.supabase
      .from('fsrs_cards')
      .delete()
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .eq('content_type', contentType);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    // ... error handling
  }
}
```

**Rota:**

```typescript
router.delete(
  '/unified-reviews/:contentType/:contentId',
  authMiddleware,
  (req, res) => unifiedReviewController.deleteReview(req, res)
);
```

---

## 📝 Resumo

✅ **Modal de Informação:** Criado e pronto para integrar
✅ **Modal de Sugestão:** Criado e pronto para integrar
⏳ **Endpoints backend:** Precisam ser criados
⏳ **Integração frontend:** Precisa adicionar lógica nos componentes

**Próximos passos:**
1. Criar endpoints backend (checkConsecutiveGoodResponses e deleteReview)
2. Adicionar botão de interrogação nos componentes
3. Adicionar lógica de detecção de sequência
4. Testar fluxo completo
