-- Migration: Create admin tables
-- Description: Creates admins and admin_actions tables for admin management system
-- Date: 2025-02-01

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'superadmin')),
  permissions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_actions_performed_by ON public.admin_actions(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON public.admin_actions(type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_timestamp ON public.admin_actions(timestamp DESC);

-- Create updated_at trigger for admins table
CREATE OR REPLACE FUNCTION update_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION update_admins_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins table
-- Only admins can view admin records
CREATE POLICY "Admins can view all admin records"
  ON public.admins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Only superadmins can insert new admins
CREATE POLICY "Superadmins can insert admin records"
  ON public.admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Only superadmins can update admin records
CREATE POLICY "Superadmins can update admin records"
  ON public.admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Only superadmins can delete admin records
CREATE POLICY "Superadmins can delete admin records"
  ON public.admins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- RLS Policies for admin_actions table
-- Admins can view all admin actions
CREATE POLICY "Admins can view all admin actions"
  ON public.admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Admins can insert their own actions
CREATE POLICY "Admins can insert admin actions"
  ON public.admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.admins IS 'Stores admin user records with roles and permissions';
COMMENT ON TABLE public.admin_actions IS 'Stores audit log of admin actions for compliance and monitoring';
COMMENT ON COLUMN public.admins.user_id IS 'References the auth.users table for the admin user';
COMMENT ON COLUMN public.admins.role IS 'Admin role: admin or superadmin';
COMMENT ON COLUMN public.admins.permissions IS 'JSON array of permission strings';
COMMENT ON COLUMN public.admin_actions.type IS 'Type of action performed (e.g., CREATE, UPDATE, DELETE, BLOCK_USER)';
COMMENT ON COLUMN public.admin_actions.performed_by IS 'User ID of the admin who performed the action';
COMMENT ON COLUMN public.admin_actions.metadata IS 'Additional metadata about the action in JSON format';
