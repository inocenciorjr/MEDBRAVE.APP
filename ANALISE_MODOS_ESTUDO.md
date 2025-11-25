# Análise: Modos de Estudo (Intensive/Balanced/Relaxed)

## 🎯 RESUMO

O sistema de modos de estudo **ESTÁ IMPLEMENTADO NO BACKEND** mas **NÃO ESTÁ NO WIZARD DO FRONTEND**.

---

## ✅ O QUE EXISTE NO BACKEND

### 1. **Três Modos de Estudo** (`SupabaseUnifiedReviewService.ts`)

```typescript
// Modo INTENSIVE (preparação próxima da prova - máx 14 dias)
private intensiveParameters: FSRSParameters = {
  request_retention: 0.90,  // 90% de retenção
  maximum_interval: 14,     // Máximo 14 dias entre revisões
};

// Modo BALANCED (preparação normal - máx 21 dias)
private balancedParameters: FSRSParameters = {
  request_retention: 0.85,  // 85% de retenção
  maximum_interval: 21,     // Máximo 21 dias entre revisões
};

// Modo RELAXED (preparação longa - máx 30 dias)
private relaxedParameters: FSRSParameters = {
  request_retention: 0.80,  // 80% de retenção
  maximum_interval: 30,     // Máximo 30 dias entre revisões
};
```

### 2. **Ajuste Automático Baseado na Data da Prova**

O sistema tem lógica para ajustar automaticamente o modo baseado em quantos dias faltam para a prova:

```typescript
async getUserParameters(userId: string): Promise<FSRSParameters> {
  const preferences = await this.preferencesService.getPreferences(userId);
  
  // Se auto-ajuste está DESABILITADO, usar modo manual
  if (!preferences.auto_adjust_mode) {
    return this.getModeParameters(preferences.study_mode);
  }
  
  // Se auto-ajuste está HABILITADO e tem data da prova
  if (preferences.auto_adjust_mode && preferences.exam_date) {
    const daysUntilExam = this.preferencesService.calculateDaysUntilExam(
      new Date(preferences.exam_date)
    );
    
    if (daysUntilExam <= 30) {
      return this.intensiveParameters;  // ≤ 30 dias: INTENSIVE
    } else if (daysUntilExam <= 90) {
      return this.balancedParameters;   // 31-90 dias: BALANCED
    } else {
      return this.relaxedParameters;    // > 90 dias: RELAXED
    }
  }
  
  // Fallback: usar modo configurado
  return this.getModeParameters(preferences.study_mode);
}
```

### 3. **Preferências do Usuário** (`ReviewPreferencesService.ts`)

```typescript
interface ReviewPreferences {
  // Modo de Estudo (FSRS)
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  auto_adjust_mode: boolean; // Se true, ajusta automaticamente
  
  // Prova
  exam_date?: Date;
  
  // Intervalos
  max_interval_days: number;
  target_retention: number;
}
```

**Valores Padrão:**
- `study_mode`: `'balanced'`
- `auto_adjust_mode`: `true` (ajuste automático ATIVADO)
- `max_interval_days`: `21`
- `target_retention`: `0.85`

### 4. **API Endpoints**

```typescript
// Definir data da prova
POST /api/review-preferences/set-exam-date
Body: { exam_date: "2024-12-31" }

// Remover data da prova
DELETE /api/review-preferences/exam-date

// Ativar modo cramming (intensive + reagendar cards)
POST /api/unified-reviews/activate-cramming
Body: { exam_date: "2024-12-31" }
```

### 5. **Dashboard** (`ReviewDashboardService.ts`)

O dashboard retorna:
```typescript
{
  study_mode: 'intensive' | 'balanced' | 'relaxed',
  max_interval_days: number,
  days_until_exam: number | null,
  // ... outros dados
}
```

---

## ❌ O QUE FALTA NO FRONTEND

### 1. **Wizard NÃO pergunta sobre:**
- ❌ Data da prova
- ❌ Modo de estudo (intensive/balanced/relaxed)
- ❌ Auto-ajuste automático
- ❌ Retenção desejada

### 2. **Wizard ATUAL tem apenas:**
- ✅ Tipos de conteúdo (Questões, Flashcards, Caderno de Erros)
- ✅ Modo de agendamento (Traditional vs Smart)
- ✅ Limite diário de revisões
- ✅ Dias de estudo

---

## 🔄 COMO FUNCIONA O SISTEMA

### Cenário 1: Auto-Ajuste ATIVADO (padrão)

1. Usuário define data da prova: `31/12/2024`
2. Sistema calcula dias até prova: `45 dias`
3. Sistema escolhe automaticamente: **BALANCED** (31-90 dias)
4. Parâmetros FSRS:
   - Retenção: 85%
   - Intervalo máximo: 21 dias

### Cenário 2: Auto-Ajuste DESATIVADO

1. Usuário escolhe manualmente: **INTENSIVE**
2. Sistema usa sempre: **INTENSIVE**
3. Parâmetros FSRS:
   - Retenção: 90%
   - Intervalo máximo: 14 dias

### Cenário 3: Modo Cramming (Emergência)

1. Usuário ativa cramming com data da prova
2. Sistema:
   - Define modo: **INTENSIVE**
   - Limite diário: 200 revisões
   - Intervalo máximo: 7 dias
   - **Reagenda todos os cards** para no máximo 7 dias

---

## 📊 IMPACTO DOS MODOS NO CÁLCULO DE REVISÃO

### INTENSIVE (Prova próxima)
- **Retenção**: 90% (mais rigoroso)
- **Intervalo máximo**: 14 dias
- **Uso**: Quando faltam ≤ 30 dias para prova
- **Resultado**: Mais revisões, intervalos curtos, maior retenção

### BALANCED (Preparação normal)
- **Retenção**: 85% (equilibrado)
- **Intervalo máximo**: 21 dias
- **Uso**: Quando faltam 31-90 dias para prova
- **Resultado**: Revisões moderadas, intervalos médios

### RELAXED (Preparação longa)
- **Retenção**: 80% (mais espaçado)
- **Intervalo máximo**: 30 dias
- **Uso**: Quando faltam > 90 dias para prova
- **Resultado**: Menos revisões, intervalos longos

---

## 🎯 O QUE PRECISA SER IMPLEMENTADO

### 1. **Adicionar Step no Wizard** (Novo Step 2)

```typescript
// Step 2: Modo de Estudo e Data da Prova
{
  // Opção 1: Auto-ajuste (recomendado)
  auto_adjust_mode: true,
  exam_date: Date,
  
  // Opção 2: Manual
  auto_adjust_mode: false,
  study_mode: 'intensive' | 'balanced' | 'relaxed',
}
```

**Interface sugerida:**

```
┌─────────────────────────────────────────┐
│ Modo de Estudo                          │
├─────────────────────────────────────────┤
│                                         │
│ ○ Ajuste Automático (Recomendado)      │
│   Ajusta automaticamente baseado na     │
│   data da sua prova                     │
│                                         │
│   📅 Data da Prova: [___________]       │
│                                         │
│ ○ Manual                                │
│   Escolha o modo manualmente            │
│                                         │
│   ○ Intensive (Prova próxima)           │
│   ○ Balanced (Preparação normal)        │
│   ○ Relaxed (Preparação longa)          │
│                                         │
└─────────────────────────────────────────┘
```

### 2. **Atualizar Página de Revisões**

Mostrar informações do modo atual:

```typescript
{dashboard.days_until_exam && (
  <div className="alert alert-info">
    <span className="material-symbols-outlined">event</span>
    <div>
      <strong>Prova em {dashboard.days_until_exam} dias</strong>
      <p>Modo: {dashboard.study_mode.toUpperCase()}</p>
      <p>Intervalo máximo: {dashboard.max_interval_days} dias</p>
    </div>
  </div>
)}
```

### 3. **Botão "Modo Cramming"**

Para situações de emergência (prova muito próxima):

```typescript
<button onClick={() => activateCramming(examDate)}>
  🚨 Ativar Modo Cramming
</button>
```

---

## 🔍 VERIFICAÇÃO: ESTÁ SENDO USADO?

### SIM! O sistema está sendo usado:

1. **Ao criar card FSRS**: Usa `getUserParameters()` para pegar parâmetros corretos
2. **Ao calcular próxima revisão**: Usa `maximum_interval` do modo atual
3. **Ao calcular estabilidade**: Usa `request_retention` do modo atual
4. **No dashboard**: Mostra modo atual e dias até prova

### Exemplo de uso no código:

```typescript
// SupabaseUnifiedReviewService.ts - linha 820
async createReviewItem(...) {
  // Buscar parâmetros do usuário (considera modo de estudo)
  const fsrsParams = await this.getUserParameters(userId);
  
  // Criar card com parâmetros corretos
  const newCard = createEmptyCard(now, fsrsParams);
  
  // Agendar primeira revisão
  const scheduling = fsrs.repeat(newCard, now);
  // ...
}
```

---

## ⚠️ PROBLEMA IDENTIFICADO

**O wizard NÃO está salvando `study_mode` nem `exam_date`!**

Olhando o código do wizard:

```typescript
const [data, setData] = useState<WizardData>({
  enable_questions: true,
  enable_flashcards: true,
  enable_error_notebook: true,
  scheduling_mode: 'smart',
  daily_reviews_limit: 50,
  study_days: [1, 2, 3, 4, 5],
  content_distribution: { questions: 40, flashcards: 30, error_notebook: 30 },
  // ❌ FALTA: study_mode
  // ❌ FALTA: auto_adjust_mode
  // ❌ FALTA: exam_date
});
```

**Resultado:** O sistema usa sempre os valores padrão:
- `study_mode: 'balanced'`
- `auto_adjust_mode: true`
- `exam_date: null`

---

## ✅ SOLUÇÃO

### 1. **Adicionar campos ao wizard:**

```typescript
interface WizardData {
  // ... campos existentes
  
  // NOVOS:
  auto_adjust_mode: boolean;
  study_mode: 'intensive' | 'balanced' | 'relaxed';
  exam_date?: string;
}
```

### 2. **Adicionar novo step no wizard** (entre step 1 e 2):

```typescript
{step === 2 && (
  <div className="space-y-6">
    <h3>Modo de Estudo</h3>
    
    {/* Opção 1: Auto-ajuste */}
    <div onClick={() => setData({...data, auto_adjust_mode: true})}>
      <input type="radio" checked={data.auto_adjust_mode} />
      <label>Ajuste Automático</label>
      
      {data.auto_adjust_mode && (
        <input 
          type="date" 
          value={data.exam_date}
          onChange={(e) => setData({...data, exam_date: e.target.value})}
        />
      )}
    </div>
    
    {/* Opção 2: Manual */}
    <div onClick={() => setData({...data, auto_adjust_mode: false})}>
      <input type="radio" checked={!data.auto_adjust_mode} />
      <label>Manual</label>
      
      {!data.auto_adjust_mode && (
        <select 
          value={data.study_mode}
          onChange={(e) => setData({...data, study_mode: e.target.value})}
        >
          <option value="intensive">Intensive</option>
          <option value="balanced">Balanced</option>
          <option value="relaxed">Relaxed</option>
        </select>
      )}
    </div>
  </div>
)}
```

### 3. **Atualizar numeração dos steps:**
- Step 1: Tipos de Conteúdo
- **Step 2: Modo de Estudo (NOVO)**
- Step 3: Modo de Agendamento
- Step 4: Dias de Estudo
- Step 5: Resumo

---

## 🎯 CONCLUSÃO

### ✅ Backend está COMPLETO:
- Três modos implementados
- Auto-ajuste funcional
- API endpoints prontos
- Cálculos FSRS corretos

### ❌ Frontend está INCOMPLETO:
- Wizard não pergunta sobre modo de estudo
- Wizard não pergunta sobre data da prova
- Usuário não pode escolher modo manualmente
- Dashboard não mostra informações do modo

### 🚀 Próximos Passos:
1. Adicionar step no wizard para modo de estudo
2. Adicionar campo de data da prova
3. Mostrar informações do modo no dashboard
4. Adicionar botão "Modo Cramming" para emergências

---

## 💡 RECOMENDAÇÃO

**Implementar o step de modo de estudo no wizard é ESSENCIAL** porque:

1. Usuários não sabem que o sistema tem modos diferentes
2. Sistema está usando sempre valores padrão (balanced)
3. Usuários não podem definir data da prova
4. Auto-ajuste não funciona sem data da prova
5. Modo intensive/relaxed nunca são usados

**Prioridade: ALTA** 🔴
