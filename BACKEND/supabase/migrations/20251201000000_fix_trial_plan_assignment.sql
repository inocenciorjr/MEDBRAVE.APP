-- Migration: Fix trial plan assignment on user signup
-- Date: 2025-12-01
-- Description: Changes the default plan from FREE to TRIAL (7 days) when users sign up

CREATE OR REPLACE FUNCTION public.handle_auth_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Inserir o usuário
  INSERT INTO public.users (
    id,
    email,
    display_name,
    photo_url,
    role,
    username_slug,
    created_at,
    last_login,
    mastered_flashcards,
    total_decks,
    total_flashcards,
    active_flashcards
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'student',
    lower(
      regexp_replace(
        public.remove_accents(
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
        ),
        '[^a-zA-Z0-9]+', '-', 'g'
      )
    ) || '-' || substr(md5(random()::text), 1, 4),
    to_jsonb(now()),
    to_jsonb(now()),
    0,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login = to_jsonb(now()),
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url);

  -- Criar plano TRIAL de 7 dias (ao invés de FREE)
  INSERT INTO public.user_plans (user_id, plan_id, status, start_date, end_date, trial_ends_at, metadata)
  SELECT 
    NEW.id,
    'trial-plan-7days',  -- Plano TRIAL ao invés de FREE
    'TRIAL',             -- Status TRIAL
    NOW(),
    NOW() + INTERVAL '7 days',  -- 7 dias de trial
    NOW() + INTERVAL '7 days',  -- Data de término do trial
    jsonb_build_object(
      'planType', 'trial',
      'assignedAutomatically', true,
      'assignedAt', NOW(),
      'source', 'registration'
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_plans WHERE user_id = NEW.id
  );

  -- Criar pastas padrão de erro
  INSERT INTO public.error_notebook_folders (user_id, name, color, icon, "order")
  VALUES 
    (NEW.id, 'Erros Gerais', '#FF6B6B', '📝', 0),
    (NEW.id, 'Revisar', '#4ECDC4', '🔄', 1),
    (NEW.id, 'Importante', '#FFE66D', '⭐', 2),
    (NEW.id, 'Dúvidas', '#95E1D3', '❓', 3),
    (NEW.id, 'Resolvidos', '#A8E6CF', '✅', 4)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_auth_user_signup() IS 'Trigger function that creates user record and assigns TRIAL plan (7 days) on signup';
