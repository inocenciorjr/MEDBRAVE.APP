-- Migration: Fix plans and user_plans tables structure
-- Date: 2025-05-11
-- Description: Remove duplicate userPlans table and standardize plans/user_plans structure

-- ============================================================================
-- 1. Remove duplicate userPlans table (camelCase - not used by backend)
-- ============================================================================
DROP TABLE IF EXISTS "userPlans" CASCADE;

-- ============================================================================
-- 2. Recreate plans table with correct structure
-- ============================================================================
DROP TABLE IF EXISTS plans CASCADE;

CREATE TABLE plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  duration_days INTEGER NOT NULL,
  interval TEXT DEFAULT 'monthly',
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  badge TEXT,
  highlight BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_plans_is_active ON plans(is_active);
CREATE INDEX idx_plans_is_public ON plans(is_public);
CREATE INDEX idx_plans_display_order ON plans(display_order);

-- Add table comment
COMMENT ON TABLE plans IS 'Stores subscription plans available for users';

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active public plans"
  ON plans FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Admins can view all plans"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can insert plans"
  ON plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update plans"
  ON plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can delete plans"
  ON plans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- ============================================================================
-- 3. Recreate user_plans table with correct structure
-- ============================================================================
DROP TABLE IF EXISTS user_plans CASCADE;

CREATE TABLE user_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  last_payment_id TEXT,
  payment_method TEXT,
  auto_renew BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX idx_user_plans_plan_id ON user_plans(plan_id);
CREATE INDEX idx_user_plans_status ON user_plans(status);
CREATE INDEX idx_user_plans_end_date ON user_plans(end_date);

-- Add table comment
COMMENT ON TABLE user_plans IS 'Stores user subscription plans and their status';

-- Enable RLS
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plans"
  ON user_plans FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all plans"
  ON user_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can insert plans"
  ON user_plans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update plans"
  ON user_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can cancel their own plans"
  ON user_plans FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (
    auth.uid()::text = user_id
    AND status = 'CANCELLED'
  );
