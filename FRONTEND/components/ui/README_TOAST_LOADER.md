# 🎨 Sistema de Toast e Loader - MedBrave

## 📦 Componentes Criados

### 1. Toast System (Notificações)
- `ToastContext.tsx` - Context provider
- `ToastContainer.tsx` - Container visual dos toasts
- Substitui os alerts feios do navegador

### 2. MedBrave Loader
- `MedBraveLoader.tsx` - Loader animado com logo
- Animações: giro suave + pulsação + brilho
- Múltiplos tamanhos e modos

## 🚀 Como Usar

### Setup Inicial

1. Adicionar no `layout.tsx` principal:

```tsx
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ToastContainer } from '@/components/ui/ToastContainer';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
```

### Usando Toasts

```tsx
import { useToast } from '@/lib/contexts/ToastContext';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Lista criada!', 'Sua lista de questões foi criada com sucesso');
  };

  const handleError = () => {
    toast.error('Erro ao salvar', 'Não foi possível salvar as alterações');
  };

  const handleWarning = () => {
    toast.warning('Atenção', 'Você tem questões não respondidas');
  };

  const handleInfo = () => {
    toast.info('Nova atualização', 'Confira as novidades da versão 2.0');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Sucesso</button>
      <button onClick={handleError}>Erro</button>
      <button onClick={handleWarning}>Aviso</button>
      <button onClick={handleInfo}>Info</button>
    </div>
  );
}
```

### Usando Loader

```tsx
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';

// Loader inline
<MedBraveLoader size="md" text="Carregando questões..." />

// Loader fullscreen
<MedBraveLoader size="lg" text="Processando..." fullScreen />

// Tamanhos disponíveis: 'sm' | 'md' | 'lg' | 'xl'
```

### Exemplo Completo - Criar Lista

```tsx
'use client';

import { useState } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';
import { MedBraveLoader } from '@/components/ui/MedBraveLoader';

export function CreateListForm() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sua lógica aqui
      await createList(data);
      
      toast.success('Lista criada!', 'Sua lista foi criada com sucesso');
    } catch (error) {
      toast.error('Erro ao criar lista', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <MedBraveLoader size="lg" text="Criando lista..." fullScreen />;
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

## 🎨 Customização

### Toast Duration
```tsx
toast.showToast({
  type: 'success',
  title: 'Salvo!',
  message: 'Alterações salvas',
  duration: 3000 // 3 segundos (padrão: 5000)
});
```

### Cores e Estilos
Os toasts usam o design system do projeto:
- Success: Verde
- Error: Vermelho
- Warning: Âmbar
- Info: Azul

Todos com suporte a dark mode automático!

## ✨ Features

- ✅ Animações suaves
- ✅ Dark mode automático
- ✅ Auto-dismiss configurável
- ✅ Empilhamento de múltiplos toasts
- ✅ Ícones Material Symbols
- ✅ Totalmente tipado (TypeScript)
- ✅ Acessível (ARIA labels)
- ✅ Responsivo
