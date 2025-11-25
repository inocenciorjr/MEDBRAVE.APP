# TabGroup Component

Componente reutilizável de tabs com design moderno e responsivo.

## Características

- ✅ Grid responsivo que se adapta ao número de tabs
- ✅ Linha roxa grossa na parte inferior da tab ativa
- ✅ Suporte a ícones do Material Symbols
- ✅ Hover com transição suave
- ✅ Dark mode integrado
- ✅ Totalmente tipado com TypeScript

## Uso Básico

```tsx
import { TabGroup } from '@/components/ui/TabGroup';
import { useState } from 'react';

function MyPage() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <TabGroup
      tabs={[
        { id: 'tab1', label: 'Primeira Tab', icon: 'dashboard' },
        { id: 'tab2', label: 'Segunda Tab', icon: 'settings' },
      ]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
  );
}
```

## Props

### `tabs` (obrigatório)
Array de objetos Tab com a seguinte estrutura:
- `id`: string - Identificador único da tab
- `label`: string - Texto exibido na tab
- `icon`: string (opcional) - Nome do ícone do Material Symbols

### `activeTab` (obrigatório)
String com o ID da tab atualmente ativa.

### `onChange` (obrigatório)
Função callback chamada quando o usuário clica em uma tab. Recebe o ID da tab como parâmetro.

### `className` (opcional)
Classes CSS adicionais para o container das tabs.

## Exemplos

### 2 Tabs (padrão)
```tsx
<TabGroup
  tabs={[
    { id: 'overview', label: 'Visão Geral', icon: 'dashboard' },
    { id: 'rankings', label: 'Rankings', icon: 'leaderboard' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### 3 Tabs
```tsx
<TabGroup
  tabs={[
    { id: 'all', label: 'Todos', icon: 'list' },
    { id: 'active', label: 'Ativos', icon: 'check_circle' },
    { id: 'archived', label: 'Arquivados', icon: 'archive' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### 4 Tabs
```tsx
<TabGroup
  tabs={[
    { id: 'questions', label: 'Questões', icon: 'quiz' },
    { id: 'flashcards', label: 'Flashcards', icon: 'style' },
    { id: 'reviews', label: 'Revisões', icon: 'history' },
    { id: 'exams', label: 'Simulados', icon: 'assignment' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

### Sem Ícones
```tsx
<TabGroup
  tabs={[
    { id: 'tab1', label: 'Primeira Tab' },
    { id: 'tab2', label: 'Segunda Tab' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

## Customização

O componente usa as classes do Tailwind CSS e respeita o design system da aplicação:
- Cores primary para estado ativo
- Surface colors para estado inativo
- Border colors para bordas
- Transições suaves em todas as interações

Para customizar ainda mais, você pode adicionar classes via prop `className`:

```tsx
<TabGroup
  tabs={tabs}
  activeTab={activeTab}
  onChange={setActiveTab}
  className="mb-8 max-w-4xl mx-auto"
/>
```
