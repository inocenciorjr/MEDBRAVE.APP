-- Script para tornar uma coleção pública (todos os seus decks)
-- Substitua 'NOME_DA_COLECAO' pelo nome da coleção que deseja tornar pública

-- 1. Ver coleções disponíveis
SELECT DISTINCT collection, COUNT(*) as deck_count
FROM decks
WHERE collection IS NOT NULL
GROUP BY collection
ORDER BY deck_count DESC;

-- 2. Tornar uma coleção específica pública
-- Descomente e substitua 'NOME_DA_COLECAO' pelo nome desejado
-- UPDATE decks
-- SET is_public = true, updated_at = NOW()
-- WHERE collection = 'NOME_DA_COLECAO';

-- 3. Verificar decks públicos
SELECT collection, name, is_public
FROM decks
WHERE collection IS NOT NULL
ORDER BY collection, name;
