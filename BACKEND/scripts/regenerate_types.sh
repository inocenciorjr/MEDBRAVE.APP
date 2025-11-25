#!/bin/bash

# Script para regenerar tipos TypeScript após migração
# Execute este script após aplicar a migração no Supabase Dashboard

echo "🔄 Regenerando tipos TypeScript..."
echo "📋 Projeto: yqlfgazngdymiprsrwvf"

# Gerar novos tipos a partir do banco de dados
npx supabase gen types typescript --project-id yqlfgazngdymiprsrwvf --schema public > src/types/database.types.ts

echo "✅ Tipos TypeScript atualizados com sucesso!"
echo "📁 Arquivo gerado: src/types/database.types.ts"
echo ""
echo "Próximos passos:"
echo "1. Verifique se não há erros de compilação"
echo "2. Execute os testes para garantir que tudo está funcionando"
echo "3. Faça commit das mudanças"}}