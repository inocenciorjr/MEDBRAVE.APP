#!/bin/bash

echo "🔍 Verificando pré-requisitos para deploy..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de erros
ERRORS=0

# Verificar se está no diretório raiz
if [ ! -d "frontend" ] || [ ! -d "BACKEND" ]; then
    echo -e "${RED}❌ Execute este script do diretório raiz do projeto${NC}"
    exit 1
fi

echo "📦 Verificando Frontend..."
cd frontend

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules não encontrado. Instalando dependências...${NC}"
    npm install
fi

# Verificar build
echo "🔨 Testando build do frontend..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build do frontend OK${NC}"
else
    echo -e "${RED}❌ Build do frontend falhou${NC}"
    ERRORS=$((ERRORS + 1))
fi

cd ..

echo ""
echo "🔧 Verificando Backend..."
cd BACKEND

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules não encontrado. Instalando dependências...${NC}"
    npm install
fi

# Verificar build
echo "🔨 Testando build do backend..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build do backend OK${NC}"
else
    echo -e "${RED}❌ Build do backend falhou${NC}"
    ERRORS=$((ERRORS + 1))
fi

cd ..

echo ""
echo "📋 Verificando arquivos de configuração..."

# Verificar .env files
if [ -f "frontend/.env.local" ]; then
    echo -e "${GREEN}✅ frontend/.env.local existe${NC}"
else
    echo -e "${RED}❌ frontend/.env.local não encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "BACKEND/.env" ]; then
    echo -e "${GREEN}✅ BACKEND/.env existe${NC}"
else
    echo -e "${RED}❌ BACKEND/.env não encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "═══════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tudo pronto para deploy!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Commit e push para GitHub"
    echo "2. Seguir GUIA_DEPLOY.md"
else
    echo -e "${RED}❌ Encontrados $ERRORS erro(s)${NC}"
    echo "Corrija os erros antes de fazer deploy"
fi
echo "═══════════════════════════════════════"
