-- Remove the create_user_with_slug function to fix function_search_path_mutable warning
-- This function is no longer needed as usernameSlug functionality is consolidated in users table

DROP FUNCTION IF EXISTS public.create_user_with_slug(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.create_user_with_slug(uuid, text, text);
DROP FUNCTION IF EXISTS public.create_user_with_slug(uuid, text);
DROP FUNCTION IF EXISTS public.create_user_with_slug();

-- Verify function is removed
SELECT 'Function create_user_with_slug removed successfully' as status
WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_user_with_slug'
);