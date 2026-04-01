-- =============================================================================
-- OpenSourceCommunity — Supabase Auth Triggers
-- Run this in the Supabase SQL Editor after applying migrations.
--
-- This trigger auto-creates a public.users row and auto-joins the user to
-- all existing tenants as 'member' when a new Supabase auth user is created.
-- This covers email signup, OAuth (Google, GitHub), and magic link flows.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Create the platform user row (ON CONFLICT DO NOTHING handles the case
  -- where setup.ts already inserted the row for the initial admin user)
  INSERT INTO public.users (id, email, display_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_display_name, now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Auto-join all existing tenants as 'member'
  -- For single-tenant installations this means the user is immediately
  -- a member of the community after signing up.
  INSERT INTO public.members (tenant_id, user_id, role, display_name, created_at)
  SELECT t.id, NEW.id, 'member', v_display_name, now()
  FROM public.tenants t
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
