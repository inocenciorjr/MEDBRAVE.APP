# 🏥 MEDBRAVE - Plataforma de Educação Médica

Plataforma completa para estudos médicos com questões, flashcards, simulados e sistema de revisão espaçada (FSRS).

## 📁 Estrutura do Projeto

```
medbrave/
├── frontend/          # Next.js 16 + React + TypeScript
├── BACKEND/          # Node.js + Express + TypeScript
├── docs/             # Documentação
└── scripts/          # Scripts utilitários
```

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- PostgreSQL (via Supabase)
- Redis

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/SEU-USUARIO/medbrave.git
cd medbrave
```

2. **Configure as variáveis de ambiente**

Frontend:
```bash
cd frontend
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

Backend:
```bash
cd BACKEND
cp .env.example .env
# Edite .env com suas credenciais
```

3. **Instale as dependências**

Frontend:
```bash
cd frontend
npm install
```

Backend:
```bash
cd BACKEND
npm install
```

4. **Inicie os servidores**

Backend (terminal 1):
```bash
cd BACKEND
npm run dev
```

Frontend (terminal 2):
```bash
cd frontend
npm run dev
```

5. **Acesse a aplicação**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📦 Deploy

Veja o guia completo em [GUIA_DEPLOY.md](./GUIA_DEPLOY.md)

### Resumo:
- **Frontend**: Vercel
- **Backend**: Railway ou Render
- **Database**: Supabase
- **Storage**: Cloudflare R2

## 🛠️ Tecnologias

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- Supabase Auth

### Backend
- Node.js
- Express
- TypeScript
- Supabase (PostgreSQL)
- Redis
- Bull (filas)

## 📚 Documentação

- [Guia de Deploy](./GUIA_DEPLOY.md)
- [Como Testar](./COMO_TESTAR.md)
- [Padrões de API](./PADROES_API.md)

## 🔒 Segurança

- **NUNCA** commite arquivos `.env`
- Use `.env.example` como template
- Mantenha chaves de API seguras
- Configure CORS adequadamente

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Proprietary - Todos os direitos reservados

## 👥 Time

Desenvolvido por MEDBRAVE Team

---

**Versão**: 1.0.0  
**Última atualização**: 2025
