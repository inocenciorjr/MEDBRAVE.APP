# 🎓 Hardworq Scraper

Scraper de questões médicas do site Hardworq (app.hardworq.com.br).

## 🚀 Como Usar

### Passo a Passo

1. **Execute o comando:**

```bash
cd BACKEND
npm run scrape:hardworq -- -e "seu@email.com" -p "suasenha"
```

2. **Escolha a prova:**

O scraper vai listar todas as provas disponíveis:

```
Found 15 provas available:

  1. ENARE/ENAMED 2026 R1
  2. SUS-SP 2025
  3. REVALIDA 2024
  ...

Digite o número da prova que deseja extrair: 
```

3. **Aguarde a extração:**

O scraper vai:
- Navegar pela prova
- Extrair todas as questões
- Baixar as imagens localmente
- Gerar o arquivo JSON

4. **Arquivo gerado:**

```
output/hardworq/questions/enare-enamed-2026-1730678901234.json
```

## 📋 Opções Disponíveis

```bash
-e, --email <email>          Email de login (obrigatório)
-p, --password <password>    Senha de login (obrigatório)
-o, --output <path>          Caminho do arquivo JSON de saída (opcional)
-v, --verbose                Ativar logs detalhados
-l, --limit <number>         Limitar número de questões (0 = todas, útil para testes)
```

## 📝 Exemplos

### Extrair todas as questões da primeira prova

```bash
npm run scrape:hardworq -- -e "email@example.com" -p "senha123"
```

### Extrair apenas 10 questões (para teste)

```bash
npm run scrape:hardworq -- -e "email@example.com" -p "senha123" -l 10
```

### Com logs detalhados

```bash
npm run scrape:hardworq -- -e "email@example.com" -p "senha123" -v
```

### Especificar arquivo de saída

```bash
npm run scrape:hardworq -- -e "email@example.com" -p "senha123" -o "output/minhas-questoes.json"
```

## 📂 Arquivos Gerados

### Questões
- **Localização**: `BACKEND/output/hardworq/questions/`
- **Formato**: `{instituicao}-{ano}-{timestamp}.json`
- **Exemplo**: `enare-enamed-2026-1730678901234.json`

### Imagens
- **Localização**: `BACKEND/output/scraped/images/`
- **Formato**: `img-{hash}.{ext}`
- **Exemplo**: `img-5ae35e0f7e327f1e0db55331b101284e.png`

### Relatórios
- **Localização**: `BACKEND/output/hardworq/logs/`
- **Formato**: `report-{timestamp}.json`

## 🔍 Formato do JSON

O JSON exportado segue o mesmo formato do scraper principal:

```json
[
  {
    "id": "hardworq-323151",
    "statement": "Paciente de 25 anos...",
    "alternatives": [
      {
        "id": "hardworq-323151-alt-0",
        "text": "A) Alternativa A",
        "isCorrect": false,
        "order": 0,
        "explanation": null
      }
    ],
    "correct_alternative_id": "hardworq-323151-alt-2",
    "explanation": null,
    "difficulty": "MEDIUM",
    "difficulty_level": 3,
    "filter_ids": [],
    "sub_filter_ids": [],
    "tags": ["ENAREENAMED2026R1", "ENARE/ENAMED", "R1", "MA", "2026"],
    "source": "ENARE/ENAMED",
    "year": 2026,
    "status": "DRAFT",
    "is_annulled": false,
    "is_active": false,
    "review_count": 0,
    "average_rating": 0,
    "rating": 0,
    "created_by": "scraper-hardworq",
    "created_at": "2025-11-05T12:00:00.000Z",
    "updated_at": "2025-11-05T12:00:00.000Z",
    "image_urls": ["C:\\path\\to\\BACKEND\\output\\scraped\\images\\img-hash.png"],
    "metadata": {
      "hardworq_id": 323151,
      "hardworq_codigo": "ENAREENAMED2026R1-11",
      "prova_id": 3224,
      "prova_codigo": "ENAREENAMED2026R1",
      "estado": "MA",
      "grupo": "R1",
      "professor_comment": "O enunciado descreve...",
      "scraped_at": "2025-11-05T12:00:00.000Z",
      "scraper_version": "1.0.0",
      "scraper_source": "hardworq"
    }
  }
]
```

## 🎯 Campo Especial: professor_comment

O campo `metadata.professor_comment` contém o comentário original do professor do Hardworq. Este comentário será posteriormente:

1. Processado pela IA para evitar plágio
2. Reescrito mantendo o conteúdo educacional
3. Salvo no campo `explanation` da questão

## ⚙️ Configurações

Edite `config.ts` para ajustar:

- Timeouts
- Delays entre navegações
- Modo headless (browser visível ou não)
- Diretórios de saída

### Modo Debug (Browser Visível)

```bash
# Windows PowerShell
$env:HARDWORQ_HEADLESS="false"
npm run scrape:hardworq -- -e "email" -p "senha" -v

# Linux/Mac
HARDWORQ_HEADLESS=false npm run scrape:hardworq -- -e "email" -p "senha" -v
```

## 🐛 Troubleshooting

### Erro: "Login failed"
- Verifique email e senha
- Tente com modo debug (browser visível)

### Erro: "No questions found"
- Verifique se a prova tem questões disponíveis
- Tente com `-v` para ver logs detalhados

### Erro: "Timeout"
- Aumente o timeout em `config.ts`
- Verifique sua conexão com internet

### Console.log não captura questões
- Verifique se o site ainda está logando no console
- Abra o browser em modo debug e veja o console

## 📊 Estatísticas

O scraper exibe estatísticas ao final:

```
=== Extraction Complete ===
Duration: 45.23s
Prova: ENAREENAMED2026R1
Questions extracted: 100
With explanation: 100
With images: 45
Anuladas: 2
Output file: output/hardworq/questions/enareenamed2026r1-1730678901234.json
```

## 🔒 Segurança

- **Não commite** suas credenciais no código
- Use variáveis de ambiente se necessário
- O scraper usa Puppeteer Stealth para evitar detecção

## 📝 Notas

- O scraper extrai **uma prova por vez**
- Para extrair múltiplas provas, execute o comando várias vezes
- O console.log aparece **2 vezes** por questão (React StrictMode), mas o scraper remove duplicatas automaticamente
- Imagens são referenciadas por URL (não são baixadas localmente)
