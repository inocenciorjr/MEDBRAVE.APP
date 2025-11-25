# ✅ Checklist de Testes - Sistema de Flashcards

## 🎯 Objetivo
Verificar que todas as funcionalidades de flashcards estão funcionando corretamente após a conexão frontend-backend.

## 📋 Testes Obrigatórios

### 1. Importação de Arquivo Anki (.apkg)

#### Teste 1.1: Upload e Preview
- [ ] Acessar `/flashcards/colecoes`
- [ ] Clicar em "Importar Arquivo Anki"
- [ ] Selecionar arquivo .apkg
- [ ] Verificar se preview é exibido com:
  - [ ] Nome da coleção
  - [ ] Número de decks
  - [ ] Número de cards
  - [ ] Número de arquivos de mídia
  - [ ] Detecção de duplicatas (se houver)

#### Teste 1.2: Importação Completa
- [ ] Confirmar importação
- [ ] Verificar progresso em tempo real
- [ ] Aguardar conclusão
- [ ] Verificar se decks aparecem na lista
- [ ] Abrir um deck importado
- [ ] Verificar se cards estão corretos
- [ ] Verificar se imagens estão carregando (URLs do R2)

#### Teste 1.3: Verificação no Banco
```sql
-- Verificar decks criados
SELECT * FROM decks WHERE user_id = 'SEU_USER_ID' ORDER BY created_at DESC LIMIT 10;

-- Verificar flashcards criados
SELECT * FROM flashcards WHERE deck_id IN (
  SELECT id FROM decks WHERE user_id = 'SEU_USER_ID'
) ORDER BY created_at DESC LIMIT 10;

-- Verificar coleções criadas
SELECT * FROM collections WHERE user_id = 'SEU_USER_ID' ORDER BY created_at DESC;
```

### 2. Criação Manual de Flashcard

#### Teste 2.1: Criar Deck
- [ ] Acessar `/flashcards/colecoes`
- [ ] Clicar em "Criar Deck"
- [ ] Preencher:
  - [ ] Nome do deck
  - [ ] Descrição
  - [ ] Tags
  - [ ] Coleção
- [ ] Salvar
- [ ] Verificar se deck aparece na lista

#### Teste 2.2: Criar Flashcard
- [ ] Abrir deck criado
- [ ] Clicar em "Adicionar Card"
- [ ] Preencher:
  - [ ] Frente (front)
  - [ ] Verso (back)
  - [ ] Tags (opcional)
  - [ ] Notas pessoais (opcional)
- [ ] Salvar
- [ ] Verificar se card aparece no deck

#### Teste 2.3: Editar Flashcard
- [ ] Abrir card criado
- [ ] Clicar em "Editar"
- [ ] Modificar conteúdo
- [ ] Salvar
- [ ] Verificar se alterações foram salvas

#### Teste 2.4: Deletar Flashcard
- [ ] Selecionar card
- [ ] Clicar em "Deletar"
- [ ] Confirmar exclusão
- [ ] Verificar se card foi removido

### 3. Estudo de Flashcards

#### Teste 3.1: Iniciar Sessão de Estudo
- [ ] Acessar `/flashcards/estudo/[deckId]`
- [ ] Verificar se primeiro card é exibido
- [ ] Verificar se frente está visível
- [ ] Clicar em "Mostrar Resposta"
- [ ] Verificar se verso é exibido

#### Teste 3.2: Registrar Revisão
- [ ] Avaliar card com qualidade (Again, Hard, Good, Easy)
- [ ] Verificar se próximo card é exibido
- [ ] Completar sessão de estudo
- [ ] Verificar estatísticas atualizadas

#### Teste 3.3: Verificação no Banco
```sql
-- Verificar interações registradas
SELECT * FROM user_flashcard_interactions 
WHERE user_id = 'SEU_USER_ID' 
ORDER BY last_reviewed_at DESC 
LIMIT 10;
```

### 4. Biblioteca (Minhas Coleções)

#### Teste 4.1: Visualizar Coleções
- [ ] Acessar `/flashcards/colecoes`
- [ ] Verificar se coleções próprias são exibidas
- [ ] Verificar se coleções importadas são exibidas
- [ ] Verificar estatísticas de cada coleção:
  - [ ] Número de decks
  - [ ] Número de cards
  - [ ] Última revisão

#### Teste 4.2: Expandir Coleção
- [ ] Clicar em uma coleção
- [ ] Verificar se decks da coleção são exibidos
- [ ] Verificar hierarquia (se houver subpastas)

#### Teste 4.3: Gerenciar Deck
- [ ] Clicar em um deck
- [ ] Verificar opções:
  - [ ] Estudar
  - [ ] Editar
  - [ ] Deletar
  - [ ] Tornar público/privado
  - [ ] Favoritar

### 5. Comunidade

#### Teste 5.1: Explorar Coleções Públicas
- [ ] Acessar `/flashcards/comunidade`
- [ ] Verificar se coleções públicas são exibidas
- [ ] Verificar filtros:
  - [ ] Por instituição
  - [ ] Por especialidade
  - [ ] Por popularidade

#### Teste 5.2: Adicionar à Biblioteca
- [ ] Selecionar uma coleção pública
- [ ] Clicar em "Adicionar à Biblioteca"
- [ ] Verificar se coleção aparece em "Minhas Coleções"
- [ ] Verificar se decks foram copiados

#### Teste 5.3: Interações Sociais
- [ ] Curtir uma coleção
- [ ] Verificar se contador de likes aumentou
- [ ] Avaliar uma coleção (1-5 estrelas)
- [ ] Adicionar comentário (se implementado)

### 6. Busca Global

#### Teste 6.1: Buscar Flashcards
- [ ] Usar barra de busca
- [ ] Digitar termo de busca
- [ ] Verificar resultados:
  - [ ] Resultados diretos (nome, descrição)
  - [ ] Resultados em pastas relacionadas
- [ ] Clicar em um resultado
- [ ] Verificar se navega para o deck correto

#### Teste 6.2: Filtros de Busca
- [ ] Aplicar filtros:
  - [ ] Por tags
  - [ ] Por status
  - [ ] Por dificuldade
- [ ] Verificar se resultados são filtrados corretamente

### 7. Upload de Mídia (R2)

#### Teste 7.1: Verificar URLs de Imagens
- [ ] Importar APKG com imagens
- [ ] Abrir card com imagem
- [ ] Verificar se imagem carrega
- [ ] Inspecionar elemento (F12)
- [ ] Verificar se URL é do R2 (Cloudflare)
- [ ] Exemplo: `https://pub-xxx.r2.dev/flashcards/...`

#### Teste 7.2: Verificar Diferentes Tipos de Mídia
- [ ] Imagens (JPG, PNG, GIF, SVG)
- [ ] Áudio (MP3, OGG)
- [ ] Vídeo (MP4, WEBM) - se suportado

### 8. Estatísticas

#### Teste 8.1: Estatísticas de Deck
- [ ] Abrir um deck
- [ ] Verificar estatísticas:
  - [ ] Total de cards
  - [ ] Cards para revisar
  - [ ] Última revisão
  - [ ] Taxa de acerto

#### Teste 8.2: Estatísticas Globais
- [ ] Acessar dashboard
- [ ] Verificar estatísticas gerais:
  - [ ] Total de decks
  - [ ] Total de cards
  - [ ] Cards estudados hoje
  - [ ] Tempo de estudo

### 9. Performance

#### Teste 9.1: Cache
- [ ] Carregar lista de decks
- [ ] Recarregar página
- [ ] Verificar se carrega mais rápido (cache)
- [ ] Aguardar 3 minutos
- [ ] Recarregar novamente
- [ ] Verificar se busca dados atualizados

#### Teste 9.2: Paginação
- [ ] Criar/importar muitos decks (>50)
- [ ] Verificar se paginação funciona
- [ ] Navegar entre páginas
- [ ] Verificar performance

### 10. Segurança

#### Teste 10.1: Autenticação
- [ ] Tentar acessar `/flashcards` sem login
- [ ] Verificar se redireciona para login
- [ ] Fazer login
- [ ] Verificar se acessa normalmente

#### Teste 10.2: Autorização
- [ ] Tentar acessar deck de outro usuário
- [ ] Verificar se retorna erro 403
- [ ] Tentar editar deck de outro usuário
- [ ] Verificar se retorna erro 403

#### Teste 10.3: RLS (Row Level Security)
```sql
-- Tentar acessar dados de outro usuário via SQL
SELECT * FROM decks WHERE user_id != 'SEU_USER_ID';
-- Deve retornar vazio ou erro
```

## 🐛 Testes de Erro

### Teste E.1: Arquivo Inválido
- [ ] Tentar importar arquivo que não é .apkg
- [ ] Verificar se mostra erro apropriado

### Teste E.2: Arquivo Muito Grande
- [ ] Tentar importar arquivo > 500MB
- [ ] Verificar se mostra erro de tamanho

### Teste E.3: Arquivo Corrompido
- [ ] Tentar importar .apkg corrompido
- [ ] Verificar se mostra erro de processamento

### Teste E.4: Sem Conexão
- [ ] Desconectar internet
- [ ] Tentar carregar decks
- [ ] Verificar se mostra erro de conexão

### Teste E.5: Timeout
- [ ] Importar arquivo muito grande
- [ ] Verificar se não trava a interface
- [ ] Verificar se mostra progresso

## 📊 Métricas de Sucesso

### Performance
- [ ] Tempo de carregamento da lista de decks < 2s
- [ ] Tempo de importação APKG < 30s (para arquivo médio)
- [ ] Tempo de resposta da busca < 1s

### Funcionalidade
- [ ] 100% das funcionalidades testadas funcionando
- [ ] 0 erros críticos
- [ ] 0 dados mockados em produção

### Segurança
- [ ] 100% das rotas protegidas com autenticação
- [ ] 100% dos recursos verificando propriedade
- [ ] RLS ativo em todas as tabelas

## 🎯 Critérios de Aceitação

Para considerar o sistema pronto para produção, todos os testes acima devem passar com sucesso.

### Obrigatórios (Bloqueantes)
- ✅ Importação APKG funcionando
- ✅ Criação manual de flashcards funcionando
- ✅ Estudo de flashcards funcionando
- ✅ Upload de imagens para R2 funcionando
- ✅ Autenticação e autorização funcionando

### Desejáveis (Não Bloqueantes)
- ⏳ Comunidade totalmente funcional
- ⏳ Estatísticas detalhadas
- ⏳ Busca avançada com filtros
- ⏳ Interações sociais (likes, comentários)

## 📝 Relatório de Testes

Após executar todos os testes, preencher:

```
Data: ___/___/______
Testador: _______________

Testes Executados: ___/___
Testes Passados: ___/___
Testes Falhados: ___/___

Erros Críticos: ___
Erros Médios: ___
Erros Menores: ___

Status Final: [ ] APROVADO  [ ] REPROVADO  [ ] APROVADO COM RESSALVAS

Observações:
_________________________________
_________________________________
_________________________________
```

## 🚀 Próximos Passos Após Testes

1. Corrigir erros encontrados
2. Re-testar funcionalidades corrigidas
3. Documentar problemas conhecidos
4. Planejar melhorias futuras
5. Deploy em produção
