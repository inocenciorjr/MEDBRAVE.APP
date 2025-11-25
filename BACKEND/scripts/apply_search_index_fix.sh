#!/bin/bash

# Script para aplicar a correção do schema da tabela flashcard_search_index

echo "=== Aplicando correção do schema flashcard_search_index ==="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "Erro: Execute este script na raiz do projeto BACKEND"
    exit 1
fi

# Verificar conexão com o banco
echo "Verificando conexão com o banco de dados..."
supabase status

# Aplicar migration
echo "Aplicando migration para corrigir schema..."
supabase db push --file scripts/fix_flashcard_search_index_schema.sql

# Verificar se a tabela foi criada corretamente
echo "Verificando schema da tabela..."
supabase db dump --schema-only --table flashcard_search_index

# Gerar novos tipos TypeScript
echo "Gerando novos tipos TypeScript..."
npm run generate-types

echo "=== Correção aplicada com sucesso! ==="
echo "Próximos passos:"
echo "1. Reinicie o servidor backend"
echo "2. Execute a importação novamente"
echo "3. Verifique os logs para confirmação"