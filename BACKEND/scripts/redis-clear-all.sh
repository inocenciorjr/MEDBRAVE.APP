#!/bin/bash

# Script para limpar TUDO do Redis relacionado ao BullMQ
# ATENÇÃO: Isso remove TODOS os dados da queue!

echo "🧹 Limpando Redis - BullMQ Queue..."
echo ""

# Conectar ao Redis e executar comandos
docker exec -it redis redis-cli << EOF
# Listar todas as keys relacionadas à queue
KEYS bull:scraper-jobs:*

# Deletar todas as keys da queue
EVAL "local keys = redis.call('keys', 'bull:scraper-jobs:*') for i=1,#keys,5000 do redis.call('del', unpack(keys, i, math.min(i+4999, #keys))) end return keys" 0

# Verificar se ainda existem keys
KEYS bull:scraper-jobs:*

# Mostrar info do Redis
INFO keyspace

EOF

echo ""
echo "✅ Limpeza concluída!"
echo ""
