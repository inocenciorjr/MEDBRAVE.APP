-- Função otimizada para buscar coleções públicas
-- Esta função agrupa decks por coleção e retorna apenas coleções onde TODOS os decks são públicos
-- Muito mais rápido que buscar todos os decks e filtrar no backend

CREATE OR REPLACE FUNCTION get_public_collections(p_user_id UUID)
RETURNS TABLE (
  name TEXT,
  user_id UUID,
  deck_count BIGINT,
  card_count BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE,
  cover_image_url TEXT,
  author_name TEXT,
  author_avatar TEXT,
  likes BIGINT,
  imports BIGINT,
  is_hot BOOLEAN,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH public_collections AS (
    -- Agrupar decks por coleção
    SELECT 
      d.collection,
      d.user_id,
      COUNT(d.id) as deck_count,
      SUM(d.flashcard_count) as card_count,
      MAX(d.updated_at) as updated_at,
      MAX(d.cover_image_url) FILTER (WHERE d.cover_image_url IS NOT NULL) as cover_image_url,
      -- Verificar se TODOS os decks da coleção são públicos
      BOOL_AND(d.is_public) as all_public
    FROM decks d
    WHERE 
      d.collection IS NOT NULL 
      AND d.user_id != p_user_id  -- Excluir coleções do próprio usuário
    GROUP BY d.collection, d.user_id
    HAVING BOOL_AND(d.is_public) = true  -- Apenas coleções onde TODOS os decks são públicos
  )
  SELECT 
    pc.collection as name,
    pc.user_id,
    pc.deck_count,
    pc.card_count,
    pc.updated_at,
    pc.cover_image_url,
    u.name as author_name,
    u.avatar_url as author_avatar,
    COALESCE(
      (SELECT COUNT(*) FROM collection_likes cl WHERE cl.collection_name = pc.collection),
      0
    ) as likes,
    COALESCE(
      (SELECT COUNT(*) FROM collection_imports ci WHERE ci.collection_name = pc.collection),
      0
    ) as imports,
    false as is_hot,  -- TODO: implementar lógica de "em alta"
    pc.cover_image_url as thumbnail_url
  FROM public_collections pc
  LEFT JOIN users u ON u.id = pc.user_id
  ORDER BY pc.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo
COMMENT ON FUNCTION get_public_collections IS 'Retorna coleções públicas da comunidade (onde TODOS os decks são públicos) com informações agregadas de autor, likes e imports';
