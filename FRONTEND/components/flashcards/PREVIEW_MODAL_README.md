# Preview Modal - Documentação

## Visão Geral

O `PreviewModal` é um componente robusto que exibe uma lista de flashcards com perguntas e respostas em formato de duas colunas, permitindo visualizar o conteúdo antes de iniciar o estudo.

## Características

✅ **Layout em duas colunas** - Questão | Resposta lado a lado
✅ **Botão mostrar/ocultar respostas** - Controle de visibilidade global
✅ **Suporte a HTML** - Renderiza conteúdo formatado
✅ **Suporte a imagens** - Exibe imagens tanto nas perguntas quanto nas respostas
✅ **Responsivo** - Adapta-se a diferentes tamanhos de tela
✅ **Dark mode** - Totalmente compatível com tema escuro
✅ **Design elegante** - Alinhado com o design system do projeto (IBM Plex Sans, cores slate)

## Como Usar

### Importação

```tsx
import { PreviewModal } from '@/components/flashcards/PreviewModal';
```

### Exemplo de Uso

```tsx
'use client';

import { useState } from 'react';
import { PreviewModal } from '@/components/flashcards/PreviewModal';
import { mockFlashcards } from '@/lib/mock-data/flashcards';

export function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  const handleStartStudy = () => {
    setShowModal(false);
    // Redirecionar para página de estudo
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Ver Preview
      </button>

      <PreviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        deckName="HIAE (Preventiva)"
        deckTags={['PREV', 'Deck de Aula']}
        flashcards={mockFlashcards}
        onStartStudy={handleStartStudy}
      />
    </>
  );
}
```

## Props

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | Sim | Controla a visibilidade do modal |
| `onClose` | `() => void` | Sim | Callback chamado ao fechar o modal |
| `deckName` | `string` | Sim | Nome do deck exibido no cabeçalho |
| `deckTags` | `string[]` | Não | Tags do deck (ex: ['PREV', 'Deck de Aula']) |
| `flashcards` | `Flashcard[]` | Sim | Array de flashcards a serem exibidos |
| `onStartStudy` | `() => void` | Sim | Callback chamado ao clicar em "Estudar deck" |

## Estrutura do Flashcard

```typescript
interface Flashcard {
  id: string;
  deckId: string;
  front: string;        // Pergunta
  back: string;         // Resposta
  isHtml?: boolean;     // Se true, renderiza HTML
  images?: string[];    // URLs das imagens
  breadcrumb: string[];
  // ... outros campos
}
```

## Funcionalidades

### 1. Mostrar/Ocultar Respostas

O botão no footer permite alternar entre mostrar e ocultar todas as respostas de uma vez.

### 2. Suporte a HTML

Se `isHtml: true`, o conteúdo será renderizado como HTML:

```typescript
{
  front: 'Pergunta simples',
  back: '<ul><li>Item 1</li><li>Item 2</li></ul>',
  isHtml: true
}
```

### 3. Suporte a Imagens

Adicione URLs de imagens no array `images`:

```typescript
{
  front: 'Qual o diagnóstico?',
  back: 'Evisceração',
  images: ['https://example.com/image.jpg']
}
```

## Integração com DeckCard

O modal já está integrado no componente `DeckCard`. Ao clicar no botão "Preview", o modal será aberto automaticamente.

## Responsividade

- **Desktop (lg+)**: Layout em 3 colunas (número | questão | resposta)
- **Mobile/Tablet**: Layout empilhado verticalmente
- **Footer**: Botões se adaptam ao tamanho da tela

## Estilização

O modal usa as cores e fontes do design system:
- Fonte: IBM Plex Sans
- Cores: slate-700/slate-200
- Peso: font-medium/font-semibold
- Suporte completo a dark mode

## Notas

- As imagens são carregadas via Next.js Image para otimização
- O modal tem scroll interno para lidar com muitos flashcards
- O backdrop escurece o fundo (bg-black/60)
- Animações suaves nas transições
