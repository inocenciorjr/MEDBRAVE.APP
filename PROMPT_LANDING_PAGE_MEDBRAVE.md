# PROMPT PARA CRIAÇÃO DA LANDING PAGE - MEDBRAVE

---

## ⚠️ INSTRUÇÕES IMPORTANTES - LEIA ANTES DE COMEÇAR

**ANTES DE ESCREVER QUALQUER CÓDIGO:**

1. **Analise o projeto existente** - Navegue pelos diretórios `frontend/` e `BACKEND/` para entender a estrutura, padrões e convenções já utilizadas.

2. **Leia os arquivos de configuração:**
   - `frontend/tailwind.config.ts` - Design system, cores, fontes, sombras
   - `frontend/app/globals.css` - Animações e estilos globais
   - `frontend/components/ui/` - Componentes reutilizáveis existentes

3. **Estude páginas existentes como referência de qualidade:**
   - `frontend/app/mentor/simulados/page.tsx` - Padrão de cards, filtros, estados
   - `frontend/app/mentor/mentorados/page.tsx` - Grid de cards, empty states
   - `frontend/app/flashcards/` - Estrutura de abas, carousels
   - `frontend/app/planner/page.tsx` - Layout de página

4. **Entenda as funcionalidades reais** - Leia os READMEs em:
   - `BACKEND/src/domain/mentorship/README.md`
   - `BACKEND/src/domain/payment/README.md`
   - `BACKEND/src/domain/simulatedExam/README.md`
   - `BACKEND/src/domain/questions/README.md`

5. **Absorva o contexto** - Este prompt contém informações detalhadas, mas o código-fonte é a verdade. Use este prompt como guia, mas baseie suas decisões no que já existe no projeto.

**NÃO COMECE A CODAR SEM FAZER ESSA ANÁLISE PRIMEIRO.**

---

## CONTEXTO DO PROJETO

Você vai criar a landing page da **MedBrave**, uma plataforma completa de preparação para provas de residência médica e revalidação de diploma (REVALIDA). O slogan é **"Seja Corajoso, Seja Brave!"** - a plataforma representa garra, determinação e a coragem de quem corre atrás dos seus objetivos.

---

## IDENTIDADE VISUAL E DESIGN SYSTEM

### Cores (Tailwind Config)
```
primary: '#7C3AED' (roxo vibrante)
background-light: '#F8F8FA'
background-dark: '#0A0A0A'
surface-light: '#FFFFFF'
surface-dark: '#1A1A1A'
text-light-primary: '#111827'
text-dark-primary: '#FFFFFF'
text-light-secondary: '#6B7280'
text-dark-secondary: '#A0A0A0'
border-light: '#E5E7EB'
border-dark: '#2A2A2A'
```

### Tipografia
- **Títulos**: font-display (Poppins)
- **Corpo**: font-inter (Inter)
- **Logo**: font-azonix (Azonix)

### Padrões de UI (baseado nas páginas existentes)
- Cards com `rounded-2xl`, `border border-border-light dark:border-border-dark`
- Hover states: `hover:border-primary/30 hover:shadow-lg dark:hover:shadow-dark-lg`
- Botões primários: `bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 shadow-lg hover:shadow-xl shadow-primary/30 hover:scale-105 active:scale-[0.98]`
- Gradientes: `bg-gradient-to-r from-violet-500 to-purple-500` ou `from-primary to-purple-600`
- Badges: `px-2.5 py-1 rounded-full text-xs font-semibold`
- Ícones: Material Symbols Outlined (`<span className="material-symbols-outlined">icon_name</span>`)
- Animações: `transition-all duration-200`, `animate-fade-in`, `animate-slide-in-from-bottom`

### Sombras Dark Mode
```
shadow-dark-xl: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
shadow-dark-lg: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
shadow-dark-2xl: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
```

---

## FUNCIONALIDADES DETALHADAS PARA DESTACAR

### 1. BANCO DE QUESTÕES INTELIGENTE
**O que é:** Mais de X mil questões de provas reais de residência médica e REVALIDA, organizadas e categorizadas.

**Filtros disponíveis:**
- Por especialidade médica (Clínica Médica, Cirurgia, Pediatria, GO, etc.)
- Por banca examinadora (USP, UNIFESP, ENARE, INEP-REVALIDA, etc.)
- Por ano da prova
- Por nível de dificuldade
- Por assunto/subespecialidade
- Por status (não respondidas, erradas, acertadas)

**Diferenciais:**
- Questões com comentários detalhados
- Estatísticas de desempenho por filtro
- Criação de listas personalizadas de estudo
- Histórico completo de respostas
- Integração com caderno de erros automático

---

### 2. FLASHCARDS COM REPETIÇÃO ESPAÇADA (FSRS)
**O que é:** Sistema de flashcards que usa o algoritmo FSRS (Free Spaced Repetition Scheduler) - o mesmo usado pelo Anki - para otimizar a memorização.

**Como funciona:**
- Você avalia sua resposta (Esqueci, Difícil, Bom, Fácil)
- O algoritmo calcula o momento ideal para revisar cada card
- Cards difíceis aparecem mais vezes, fáceis aparecem menos
- Memorização de longo prazo garantida cientificamente

**Recursos:**
- Coleções próprias e da comunidade
- Importação de decks Anki (.apkg)
- Coleções organizadas por instituição (Einstein, FAMEMA, etc.)
- Coleções por especialidade
- Preview antes de adicionar
- Estatísticas de cards novos, revisões pendentes, etc.

---

### 3. SIMULADOS REALISTAS
**O que é:** Reprodução fiel das provas reais com tempo cronometrado.

**Funcionalidades:**
- Simulados com questões do banco oficial
- Tempo limite configurável
- Modo prova (sem ver gabarito durante)
- Estatísticas detalhadas ao finalizar
- Comparação com média dos outros usuários
- Ranking de desempenho
- Análise por especialidade e assunto

---

### 4. CADERNO DE ERROS INTELIGENTE
**O que é:** Todas as questões que você errou, organizadas automaticamente para revisão direcionada.

**Recursos:**
- Organização por pastas personalizadas
- Filtros por especialidade, data, simulado
- Sessões de revisão focadas nos erros
- Acompanhamento de evolução (errou → acertou)
- Integração com o planner de revisões

---

### 5. PLANNER DE REVISÕES
**O que é:** Calendário inteligente que organiza suas revisões de forma otimizada.

**Funcionalidades:**
- Visualização diária e mensal
- Eventos automáticos baseados no FSRS (flashcards para revisar)
- Eventos automáticos do caderno de erros
- Tarefas personalizadas do usuário
- Configuração de horários de estudo
- Metas diárias e semanais
- Progresso visual (pendente, em andamento, concluído)
- Cores e ícones por tipo de atividade

---

### 6. PROVAS OFICIAIS NA ÍNTEGRA
**O que é:** Acesso às provas completas de residência médica e REVALIDA exatamente como foram aplicadas.

**Recursos:**
- Provas organizadas por instituição e ano
- Modo simulação real (tempo oficial)
- Gabarito oficial
- Estatísticas de desempenho

---

### 7. MEDBRAVE AI - INTELIGÊNCIA ARTIFICIAL
**O que é:** Assistente de IA especializado em medicina para tirar dúvidas e explicar questões.

**Capacidades:**
- Explicação detalhada de questões
- Análise de casos clínicos
- Diagnósticos diferenciais
- Conteúdo educacional por especialidade
- Pérolas clínicas e red flags
- Referências e guidelines
- Níveis de complexidade (básico, intermediário, avançado)

---

### 8. ESTATÍSTICAS E ANALYTICS
**O que é:** Dashboard completo com seu desempenho detalhado.

**Métricas:**
- Taxa de acerto geral e por especialidade
- Evolução ao longo do tempo (gráficos)
- Questões respondidas por dia/semana/mês
- Tempo médio por questão
- Pontos fortes e fracos identificados
- Comparação com nota de corte configurável
- Metas de estudo (REVALIDA, Residência)

---

## SEÇÃO ESPECIAL: MENTORES E MENTORIAS

### Para Mentores - Por que usar MedBrave?

**Problema que resolve:** Mentores de residência médica geralmente não têm uma plataforma própria. Usam WhatsApp, Google Drive, planilhas... MedBrave oferece infraestrutura completa.

**Vantagens para o Mentor:**

1. **Seus mentorados ganham acesso à plataforma**
   - Banco de questões completo
   - Flashcards com FSRS
   - Planner de revisões
   - Caderno de erros
   - MedBrave AI
   - Tudo incluso na mentoria!

2. **Criação de Simulados Personalizados**
   - Crie simulados com questões do banco MedBrave
   - Adicione suas próprias questões
   - Mescle questões próprias + banco oficial
   - Configure tempo, visibilidade, datas

3. **Acompanhamento de Evolução Completo**
   - Dashboard por mentoria (programa)
   - Dashboard individual por mentorado
   - Desempenho por simulado
   - Desempenho por especialidade
   - Desempenho por assunto/subespecialidade
   - Gráficos de evolução ao longo do tempo
   - Ranking entre mentorados

4. **Agendamento Direto**
   - Agende simulados diretamente na conta dos mentorados
   - Eles recebem notificação e o simulado aparece no planner

5. **Sistema de Recados/Avisos**
   - Envie comunicados para todos os mentorados
   - Ou selecione destinatários específicos
   - Aparece em destaque na home do mentorado

6. **Controle Financeiro (Opcional)**
   - Registre pagamentos dos mentorados
   - Acompanhe inadimplência
   - Relatórios financeiros

7. **Página Personalizada do Mentor**
   - Perfil público com suas informações
   - Nome da mentoria, descrição, preço
   - Especialidades, biografia
   - Informações de contato
   - Aprovação pelo admin (qualidade garantida)

---

### Seção "Mentores Parceiros"
- Grid/carousel de cards de mentores aprovados
- Cada card mostra: foto, nome, especialidade, nome da mentoria
- Link "Ver todos os mentores"
- Ao clicar no card → página personalizada do mentor (dados do banco)

---

## SEÇÃO DE PLANOS E PREÇOS

### Estrutura de Planos

**Plano Mensal**
- Acesso completo por 30 dias
- Preço: R$ XX/mês

**Plano Semestral**
- Acesso completo por 180 dias
- Preço: R$ XX/mês (economia de X%)
- Badge: "MAIS POPULAR"

**Plano Anual**
- Acesso completo por 365 dias
- Preço: R$ XX/mês (economia de X%)
- Badge: "MELHOR CUSTO-BENEFÍCIO"

### Promoção de Lançamento
- Destaque visual (banner, badge "LANÇAMENTO")
- Desconto especial por tempo limitado
- Contador regressivo (opcional)
- Cupom de desconto

### O que está incluso em todos os planos:
- Banco de questões ilimitado
- Flashcards com FSRS ilimitados
- Simulados ilimitados
- Caderno de erros
- Planner de revisões
- Provas oficiais
- MedBrave AI (X consultas/dia)
- Estatísticas avançadas
- Suporte prioritário

---

## PÚBLICO-ALVO PRINCIPAL (NICHO INICIAL)

**Foco:** Revalidandos (médicos formados no exterior que precisam revalidar o diploma no Brasil através do REVALIDA)

**Dores específicas:**
- Prova difícil e concorrida
- Material de estudo disperso
- Falta de simulados específicos
- Dificuldade de encontrar mentores especializados
- Ansiedade e pressão por aprovação

**Tom da comunicação:**
- Empático com a jornada do revalidando
- Motivacional ("Você consegue!", "Sua hora vai chegar!")
- Prático e direto
- Confiante na metodologia

---

## ESTRUTURA DA LANDING PAGE

### 1. Hero Section
- Headline impactante sobre conquistar a aprovação
- Subheadline sobre a plataforma completa
- CTA principal: "Começar Agora" ou "Teste Grátis"
- Imagem/ilustração da plataforma ou médico estudando
- Badge de lançamento/promoção

### 2. Problema/Solução
- Dores do revalidando/residente
- Como MedBrave resolve cada uma

### 3. Funcionalidades (com visual)
- Cards ou seções para cada feature principal
- Screenshots/mockups da plataforma
- Ícones e descrições curtas mas impactantes

### 4. Como Funciona
- 3-4 passos simples
- Ilustrações ou ícones

### 5. Seção de Mentores
- Explicação do programa de mentoria
- Benefícios para mentores
- Benefícios para mentorados
- Grid de mentores parceiros
- CTA: "Seja um Mentor Parceiro"

### 6. Planos e Preços
- 3 cards de planos
- Comparativo de features
- Promoção de lançamento destacada
- CTA em cada plano

### 7. Depoimentos/Social Proof
- Depoimentos de usuários (quando houver)
- Números (questões, usuários, aprovações)
- Logos de instituições/bancas

### 8. FAQ
- Perguntas frequentes
- Accordion expandível

### 9. CTA Final
- Última chamada para ação
- Reforço da proposta de valor

### 10. Footer
- Links úteis
- Redes sociais
- Contato
- Termos e privacidade

---

## TOM DE VOZ E COPYWRITING

### NÃO FAZER:
- Textos genéricos de IA
- Frases clichês ("a melhor plataforma", "revolucionário")
- Tom robótico ou corporativo
- Promessas vazias

### FAZER:
- Falar diretamente com o usuário ("você", "sua aprovação")
- Ser específico sobre benefícios
- Usar números quando possível
- Tom motivacional mas realista
- Linguagem de quem entende a jornada médica
- Humor leve quando apropriado
- Urgência genuína (prova se aproximando, vagas limitadas)

### Exemplos de headlines:
- "Chega de estudar no escuro. Saiba exatamente onde focar."
- "Sua aprovação no REVALIDA começa aqui."
- "O mesmo método que aprovou X médicos."
- "Estude como quem já passou."

---

## REQUISITOS TÉCNICOS

### Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS (usar config existente)
- Componentes existentes quando possível

### Responsividade
- Mobile-first
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

### Performance
- Lazy loading de imagens
- Componentes otimizados
- Animações suaves (não pesadas)

### Acessibilidade
- Contraste WCAG AA
- ARIA labels
- Navegação por teclado
- Focus states visíveis

### Dark Mode
- Suporte completo
- Usar classes dark: do Tailwind
- Testar ambos os modos

---

## ARQUIVOS A CRIAR

```
frontend/app/(public)/
├── page.tsx                    # Landing page principal
├── layout.tsx                  # Layout público (sem sidebar)
├── mentores/
│   ├── page.tsx               # Lista de mentores
│   └── [id]/
│       └── page.tsx           # Página do mentor
├── planos/
│   └── page.tsx               # Página de planos detalhada

frontend/components/landing/
├── Hero.tsx
├── Features.tsx
├── HowItWorks.tsx
├── MentorSection.tsx
├── MentorCard.tsx
├── PricingSection.tsx
├── PlanCard.tsx
├── Testimonials.tsx
├── FAQ.tsx
├── CTASection.tsx
├── Footer.tsx
```

---

## DADOS DINÂMICOS

### Mentores
- Buscar de `mentor_profiles` (aprovados pelo admin)
- Campos: nome, foto, especialidade, bio, nome_mentoria, preco, contato

### Planos
- Buscar de `plans` (isPublic: true, isActive: true)
- Campos: nome, preco, duracao, features, badge, highlight

---

## CHECKLIST FINAL

- [ ] Hero impactante com CTA claro
- [ ] Todas as features detalhadas
- [ ] Seção de mentores completa
- [ ] Planos com promoção de lançamento
- [ ] Responsivo (testar mobile)
- [ ] Dark mode funcionando
- [ ] Animações suaves
- [ ] Textos humanizados (não parecer IA)
- [ ] CTAs estratégicos ao longo da página
- [ ] Performance otimizada
- [ ] Acessibilidade básica
- [ ] Links funcionais
- [ ] Integração com rotas de auth (/login, /register)

---

## OBSERVAÇÕES IMPORTANTES

1. **Não inventar dados** - usar placeholders claros [X] para números que precisam ser definidos
2. **Manter consistência** com o design system existente
3. **Priorizar conversão** - cada seção deve levar ao CTA
4. **Mobile é prioridade** - maioria dos médicos estuda pelo celular
5. **Velocidade** - página deve carregar rápido
6. **SEO básico** - meta tags, títulos, descrições

---

*Este prompt foi criado com base na análise completa do backend e frontend do projeto MedBrave, incluindo todas as funcionalidades implementadas, design system, e padrões de código existentes.*
