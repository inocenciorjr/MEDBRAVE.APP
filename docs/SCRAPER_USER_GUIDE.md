# 📚 Guia do Usuário - Scraper de Questões

## Visão Geral

O Scraper de Questões é uma ferramenta integrada ao sistema MedBrave que permite extrair questões médicas de provas online de forma automática. O sistema oferece dois modos de operação:

- **Modo Manual**: Extração de uma URL por vez com revisão imediata
- **Modo Automático (Batch)**: Processamento em lote de múltiplas URLs

## 🎯 Acesso

O scraper está disponível na página de **Criação em Lote de Questões**:

1. Acesse o painel administrativo
2. Navegue para **Questões > Criar em Lote**
3. Selecione a aba desejada:
   - **PPTX**: Upload de arquivo PowerPoint
   - **Scraper Manual**: Extração de URL única
   - **Scraper Batch**: Processamento em lote

## 📝 Modo Manual

### Como Usar

1. **Cole a URL da prova** no campo de entrada
2. **Clique em "Extrair Questões"**
3. **Aguarde a extração** (pode levar alguns minutos)
4. **Revise as questões extraídas**
5. **Edite conforme necessário**
6. **Salve no banco de dados**

### Recursos Disponíveis

- ✅ Extração automática de questões, alternativas e gabaritos
- ✅ Detecção de imagens e tabelas
- ✅ Edição completa de questões
- ✅ Categorização automática via IA
- ✅ Validação antes de salvar
- ✅ Opção de salvar como prova oficial

### Dicas

- Verifique se a URL é do domínio `provaderesidencia.com.br`
- URLs devem conter `/demo/`, `/questao/` ou `/prova/`
- A extração pode levar de 2 a 5 minutos dependendo do número de questões
- Sempre revise as questões antes de salvar

## 🚀 Modo Automático (Batch)

### Como Usar

1. **Cole múltiplas URLs** (uma por linha) no campo de texto
2. **Configure cada URL** (opcional):
   - Marque "Salvar como Prova Oficial" se necessário
   - Preencha os metadados da prova (nome, ano, instituição, etc.)
3. **Clique em "Iniciar Processamento em Lote"**
4. **Acompanhe o progresso** em tempo real
5. **Revise o relatório final**

### Recursos Disponíveis

- ✅ Processamento de múltiplas URLs automaticamente
- ✅ Configuração individual por URL
- ✅ Progresso em tempo real via WebSocket
- ✅ Salvamento automático no banco de dados
- ✅ Relatório de questões faltantes
- ✅ Exportação de resultados em CSV
- ✅ Retomada de jobs interrompidos

### Jobs Salvos

Se você fechar a página durante o processamento:

- O job continua rodando no servidor
- Você pode retomar visualizando o progresso
- Jobs salvos aparecem no topo da página
- Clique em "Retomar" para reconectar ao job

### Dicas

- Processe até 10 URLs por vez para melhor performance
- Configure metadados de prova oficial antes de iniciar
- Acompanhe o progresso para identificar problemas rapidamente
- Exporte o relatório de questões faltantes para revisão manual

## ⚙️ Configurações

### Timeout

- **Padrão**: 5 minutos
- **Recomendado**: 3-5 minutos para provas com 50-100 questões
- **Máximo**: 15 minutos

### Download de Imagens

- **Ativado por padrão**
- Desative para extrações mais rápidas (não recomendado)

### Delay entre URLs (Batch)

- **Padrão**: 2 segundos
- Evita sobrecarga no servidor de origem

## 🔒 Limites e Segurança

### Rate Limiting

- **Limite**: 10 extrações por hora por usuário
- **Reset**: A cada hora
- Verifique seu limite restante na interface

### Domínios Permitidos

Apenas URLs dos seguintes domínios são aceitas:
- `provaderesidencia.com.br`
- `www.provaderesidencia.com.br`

### Segurança

- Todas as URLs são validadas e sanitizadas
- Conteúdo extraído é sanitizado para prevenir XSS
- Apenas administradores têm acesso ao scraper
- Todas as operações são registradas em logs de auditoria

## 📊 Monitoramento

Acesse a página de **Monitoramento do Scraper** para:

- Ver estatísticas de extração
- Consultar logs de execução
- Identificar erros e problemas
- Exportar relatórios

## ❓ Problemas Comuns

### "URL inválida ou domínio não suportado"

**Solução**: Verifique se a URL é do domínio `provaderesidencia.com.br` e contém `/demo/`, `/questao/` ou `/prova/`.

### "Timeout de extração"

**Solução**: A página pode estar demorando muito para carregar. Tente novamente ou aumente o timeout nas configurações.

### "Nenhuma questão encontrada"

**Solução**: A página pode não conter questões no formato esperado. Verifique se a URL está correta.

### "Limite de requisições excedido"

**Solução**: Você atingiu o limite de 10 extrações por hora. Aguarde o reset ou contate um administrador.

### "Questões faltantes no batch"

**Solução**: Algumas questões podem não ter sido extraídas corretamente. Use o relatório de questões faltantes para identificá-las e extraí-las manualmente.

## 💡 Melhores Práticas

1. **Sempre revise as questões** antes de salvar
2. **Use o modo manual** para provas importantes que requerem revisão cuidadosa
3. **Use o modo batch** para processar múltiplas provas de uma vez
4. **Configure metadados de prova oficial** quando aplicável
5. **Exporte backups** das questões extraídas
6. **Monitore os logs** para identificar problemas recorrentes
7. **Respeite os limites** de taxa de requisições

## 📞 Suporte

Em caso de problemas ou dúvidas:

1. Consulte os logs de monitoramento
2. Verifique se a URL está correta
3. Tente novamente após alguns minutos
4. Contate o suporte técnico se o problema persistir

---

**Última atualização**: 2025-02-01
