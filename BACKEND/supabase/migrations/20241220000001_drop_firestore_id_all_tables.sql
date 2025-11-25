-- Migration to remove firestore_id column from all tables
-- This completes the migration from Firebase to Supabase

-- Drop firestore_id from flashcards table
ALTER TABLE public.flashcards DROP COLUMN IF EXISTS firestore_id;

-- Drop firestore_id from notifications table
ALTER TABLE public.notifications DROP COLUMN IF EXISTS firestore_id;

-- Drop firestore_id from test table
ALTER TABLE public.test DROP COLUMN IF EXISTS firestore_id;

-- Drop firestore_id from other tables that may still have it
-- These are common tables that might have firestore_id based on the schema
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'firestore_id' 
        AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS firestore_id;', tbl.table_name);
    END LOOP;
END $$;

-- Clean up any remaining indexes on firestore_id
DO $$
DECLARE
    idx RECORD;
BEGIN
    FOR idx IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE indexname LIKE '%firestore_id%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I;', idx.indexname);
    END LOOP;
END $$;