# Sistema de Conquistas Avançado - MedForum

## 🏆 Visão Geral

Sistema de conquistas de última geração com IA e gamificação avançada para a plataforma educacional médica MedForum. Projetado para maximizar o engajamento e acompanhar a evolução educacional dos estudantes.

## ✨ Características Principais

### 🎯 Gamificação Completa
- **14 Categorias** de conquistas especializadas em medicina
- **6 Níveis de Raridade** (Common → Mythical)
- **9 Tipos de Recompensas** (XP, badges, títulos, etc.)
- **Sistema XP/Levels** integrado com streak freezes

### 🤖 Inteligência Artificial
- **Sugestões Personalizadas** baseadas em padrões de estudo
- **Análise Comportamental** avançada do usuário
- **Predição de Conquistas** com probabilidade e tempo estimado
- **Insights Automáticos** sobre performance e tendências

### 📊 Analytics Avançados
- **Leaderboards Globais/Categoria/Semanais** em tempo real
- **Estatísticas Detalhadas** por categoria e raridade
- **Relatórios de Progresso** com análise temporal
- **Rankings Percentuais** competitivos

### 🔄 Integração Robusta
- **UserStatistics** - sincronização automática
- **Sistema SRS** - conquistas de revisão espaçada
- **Questões/Exames** - triggers em tempo real
- **Streaks** - acompanhamento de consistência

## 🛠️ Arquitetura

### Estrutura Modular
```
achievements/
├── types/              # Tipos TypeScript robustos
├── interfaces/         # Contratos de serviço
├── services/          # Implementações Firebase
└── README.md          # Documentação completa
```

### Padrões Implementados
- **Repository Pattern** - abstração de dados
- **Observer Pattern** - eventos em tempo real
- **Strategy Pattern** - múltiplos algoritmos de cálculo
- **Factory Pattern** - criação de conquistas via templates

## 🚀 Exemplos de Uso

### Inicialização do Serviço
```typescript
import { FirebaseAchievementService } from './domain/achievements';
import { admin } from 'firebase-admin';

const achievementService = new FirebaseAchievementService(
  admin.firestore(),
  userStatisticsService // opcional
);
```

### Criar Conquista
```typescript
const achievement = await achievementService.createAchievement({
  name: "Primeira Centena",
  description: "Responda 100 questões corretamente",
  category: AchievementCategory.QUESTION_COUNT,
  rarity: AchievementRarity.COMMON,
  conditions: [{
    type: 'count',
    field: 'correctAnswers',
    operator: '>=',
    value: 100
  }],
  triggerType: AchievementTriggerType.IMMEDIATE,
  rewards: [
    { type: RewardType.XP, value: 500, description: "+500 XP" },
    { type: RewardType.BADGE, value: "primeira_centena", description: "Badge Primeira Centena" }
  ],
  isHidden: false,
  isRepeatable: false,
  tags: ['beginner', 'milestone'],
  isActive: true,
  createdBy: 'system'
});
```

### Verificar Conquistas (Trigger Manual)
```typescript
// Ao responder questão
const result = await achievementService.onQuestionAnswered(userId, {
  questionId: 'q123',
  correct: true,
  timeSpent: 45,
  difficulty: 'medium',
  subject: 'cardiologia'
});

console.log(`${result.newCompletions.length} conquistas completadas!`);
```

### Verificação Automática Programada
```typescript
// Verificação diária (usar em CRON)
const dailyResults = await achievementService.runDailyChecks();

// Verificação específica de usuário
const userResult = await achievementService.checkAchievements({
  userId: 'user123',
  eventType: 'manual_check',
  eventData: {},
  timestamp: Timestamp.now(),
  triggerSource: 'admin'
});
```

### Estatísticas e Analytics
```typescript
// Estatísticas do usuário
const stats = await achievementService.getUserAchievementStats(userId);
console.log(`Usuário completou ${stats.completedAchievements}/${stats.totalAchievements} conquistas`);

// Leaderboard global
const leaderboard = await achievementService.getGlobalLeaderboard(50);

// Sugestões de IA
const suggestions = await achievementService.generateAchievementSuggestions(userId);
suggestions.forEach(s => {
  console.log(`${s.achievementName}: ${s.probability}% chance, ~${s.estimatedDays} dias`);
});
```

### Análise de Padrões (IA)
```typescript
const analysis = await achievementService.analyzeUserAchievementPatterns(userId);

console.log('Categorias Fortes:', analysis.strongCategories);
console.log('Recomendações:', analysis.recommendations);
console.log('Insights:', analysis.insights);
```

### Sistema de Recompensas
```typescript
// Listar recompensas pendentes
const pending = await achievementService.getPendingRewards(userId);

// Coletar recompensas
for (const reward of pending) {
  const result = await achievementService.collectRewards(userId, reward.userAchievementId);
  console.log('XP ganho:', result.newBalance.xp);
  console.log('Badges:', result.newBalance.badges);
}
```

## 🎮 Conquistas Implementadas

### Categorias Principais

#### 📚 Study Streak
- **Dedicado Diário** - 7 dias consecutivos
- **Maratonista** - 30 dias consecutivos  
- **Inabalável** - 100 dias consecutivos
- **Lenda** - 365 dias consecutivos

#### 🎯 Accuracy
- **Mira Certeira** - 80% precisão em 100 questões
- **Sniper** - 95% precisão em 500 questões
- **Infalível** - 100% em simulado completo

#### 📊 Study Time
- **Estudioso** - 100 horas de estudo
- **Acadêmico** - 500 horas de estudo
- **Erudito** - 1000 horas de estudo

#### 🏥 Specialty
- **Cardiologista** - Domínio em cardiologia
- **Neurologista** - Domínio em neurologia
- **Cirurgião** - Domínio em cirurgia

### Sistema de Raridade
- **Common** (70%+): Conquistas básicas e introdutórias
- **Uncommon** (40-70%): Progresso intermediário
- **Rare** (15-40%): Feitos notáveis
- **Epic** (5-15%): Conquistas impressionantes
- **Legendary** (1-5%): Elite dos estudantes
- **Mythical** (<1%): Lendas do MedForum

## 🔧 Configuração Avançada

### Multiplicadores XP
```typescript
const config = await achievementService.getConfig();
config.xpMultipliers = {
  [AchievementRarity.COMMON]: 1.0,
  [AchievementRarity.UNCOMMON]: 1.2,
  [AchievementRarity.RARE]: 1.5,
  [AchievementRarity.EPIC]: 2.0,
  [AchievementRarity.LEGENDARY]: 3.0,
  [AchievementRarity.MYTHICAL]: 5.0
};
await achievementService.updateConfig(config);
```

### Templates para Criação em Massa
```typescript
const template: AchievementTemplate = {
  id: 'questoes_template',
  name: 'Respondedor',
  description: 'Responda {value} questões',
  conditionTemplate: {
    type: 'count',
    field: 'totalQuestionsAnswered',
    operator: '>=',
    value: 0 // será substituído
  },
  variations: [
    { suffix: 'Iniciante', targetValue: 50, rarity: AchievementRarity.COMMON, rewards: [...] },
    { suffix: 'Intermediário', targetValue: 200, rarity: AchievementRarity.UNCOMMON, rewards: [...] },
    { suffix: 'Avançado', targetValue: 1000, rarity: AchievementRarity.RARE, rewards: [...] }
  ],
  category: AchievementCategory.QUESTION_COUNT,
  triggerType: AchievementTriggerType.IMMEDIATE,
  createdAt: Timestamp.now(),
  isActive: true
};

const achievements = await achievementService.createAchievementsFromTemplate(template);
```

## 📈 Métricas de Performance

### Otimizações Implementadas
- **Cache de Leaderboards** - atualização a cada 30min
- **Batch Operations** - processamento em lotes
- **Query Optimization** - índices estratégicos
- **Event Throttling** - prevenção de spam

### Monitoramento
```typescript
// Métricas administrativas
const metrics = await achievementService.getAdminMetrics();
console.log('Taxa de conclusão média:', metrics.averageCompletionRate);
console.log('Top performers:', metrics.topPerformers);
```

## 🛡️ Segurança e Privacidade

### LGPD Compliance
```typescript
// Exportar dados do usuário
const userData = await achievementService.exportUserAchievementData(userId);

// Deletar dados do usuário
const deleted = await achievementService.deleteUserAchievementData(userId);
```

### Validação de Dados
- **Input Sanitization** em todas as operações
- **Rate Limiting** para prevenir abuse
- **Transaction Safety** em operações críticas
- **Error Handling** robusto com logs detalhados

## 🚀 Futuras Expansões

### Roadmap v2.0
- [ ] **Conquistas Colaborativas** - equipes de estudo
- [ ] **Eventos Sazonais** - desafios temporários
- [ ] **IA Avançada** - machine learning para predições
- [ ] **Realidade Aumentada** - badges em AR
- [ ] **Blockchain Integration** - NFTs de conquistas raras

### Integrações Planejadas
- [ ] **Discord Bot** - notificações automáticas
- [ ] **Mobile App** - push notifications nativas
- [ ] **Analytics Dashboard** - métricas em tempo real
- [ ] **API Externa** - webhook para terceiros

## 📞 Suporte

Para dúvidas, bugs ou sugestões:
- **Documentação**: `/docs/achievements`
- **Issues**: GitHub Issues
- **Discord**: #achievements-dev

---

## 🏗️ Desenvolvido com

- **TypeScript** - Type safety
- **Firebase** - Backend robusto
- **AI Algorithms** - Inteligência artificial
- **Clean Architecture** - Padrões de qualidade

**Sistema de Conquistas MedForum** - Revolucionando a educação médica através da gamificação inteligente! 🎓✨ 