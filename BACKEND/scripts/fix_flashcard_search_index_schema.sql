-- Migration: Corrigir schema da tabela flashcard_search_index
-- Esta migration corrige o schema da tabela para corresponder ao esperado pelo código

-- Passo 1: Verificar se a tabela existe e seu schema atual
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'flashcard_search_index';

-- Passo 2: Se a tabela existe com schema incorreto, renomear para backup
-- ALTER TABLE IF EXISTS public.flashcard_search_index RENAME TO flashcard_search_index_backup;

-- Passo 3: Criar tabela com schema correto
CREATE TABLE IF NOT EXISTS public.flashcard_search_index (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  deck_id text NOT NULL,
  deck_name text NOT NULL,
  deck_description text,
  collection_name text,
  flashcard_count integer DEFAULT 0,
  hierarchy jsonb DEFAULT '[]'::jsonb,
  hierarchy_path text,
  path text,
  searchable_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flashcard_search_index_pkey PRIMARY KEY (id),
  CONSTRAINT flashcard_search_index_unique_user_deck UNIQUE (user_id, deck_id)
);

-- Passo 4: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_user_id ON public.flashcard_search_index (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_deck_id ON public.flashcard_search_index (deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_collection_name ON public.flashcard_search_index (collection_name);
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_searchable_text ON public.flashcard_search_index USING gin (to_tsvector('portuguese', searchable_text));
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_created_at ON public.flashcard_search_index (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_search_index_updated_at ON public.flashcard_search_index (updated_at DESC);

-- Passo 5: Configurar RLS (Row Level Security)
ALTER TABLE public.flashcard_search_index ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
DROP POLICY IF EXISTS "Users can only see their own search index" ON public.flashcard_search_index;
CREATE POLICY "Users can only see their own search index" ON public.flashcard_search_index
  FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can only insert their own search index" ON public.flashcard_search_index;
CREATE POLICY "Users can only insert their own search index" ON public.flashcard_search_index
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can only update their own search index" ON public.flashcard_search_index;
CREATE POLICY "Users can only update their own search index" ON public.flashcard_search_index
  FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can only delete their own search index" ON public.flashcard_search_index;
CREATE POLICY "Users can only delete their own search index" ON public.flashcard_search_index
  FOR DELETE USING (auth.uid()::text = user_id);

-- Passo 6: Atualizar tipos TypeScript
-- Comando para gerar novos tipos: npm run generate-types

-- Passo 7: Limpar cache do Supabase se necessário
-- Comando: supabase db reset --db-url $DATABASE_URL

-- Comando para aplicar esta migration:
-- supabase db push --db-url $DATABASE_URL