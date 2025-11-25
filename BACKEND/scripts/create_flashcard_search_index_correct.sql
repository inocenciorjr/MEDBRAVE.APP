-- Migration: Criar tabela flashcard_search_index com schema correto
-- Esta migration cria a tabela com o schema esperado pelo código

-- Remover tabela existente se tiver schema incorreto
DROP TABLE IF EXISTS public.flashcard_search_index CASCADE;

-- Criar tabela com schema correto
CREATE TABLE public.flashcard_search_index (
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

-- Criar índices para otimizar as buscas
CREATE INDEX idx_flashcard_search_index_user_id ON public.flashcard_search_index (user_id);
CREATE INDEX idx_flashcard_search_index_deck_id ON public.flashcard_search_index (deck_id);
CREATE INDEX idx_flashcard_search_index_collection_name ON public.flashcard_search_index (collection_name);
CREATE INDEX idx_flashcard_search_index_searchable_text ON public.flashcard_search_index USING gin (to_tsvector('portuguese', searchable_text));
CREATE INDEX idx_flashcard_search_index_created_at ON public.flashcard_search_index (created_at DESC);
CREATE INDEX idx_flashcard_search_index_updated_at ON public.flashcard_search_index (updated_at DESC);

-- Enable RLS
ALTER TABLE public.flashcard_search_index ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Users can only see their own search index" ON public.flashcard_search_index
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only insert their own search index" ON public.flashcard_search_index
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can only update their own search index" ON public.flashcard_search_index
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can only delete their own search index" ON public.flashcard_search_index
  FOR DELETE USING (auth.uid()::text = user_id);

-- Atualizar tipos TypeScript (necessário rodar npm run generate-types após aplicar esta migration)
-- Comentário: Esta migration deve ser executada via Supabase CLI ou diretamente no banco