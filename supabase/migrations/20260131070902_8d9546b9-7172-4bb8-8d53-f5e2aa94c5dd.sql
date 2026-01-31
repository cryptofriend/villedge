-- ========================================
-- Fix warn-level security issues
-- ========================================

-- Fix #1: Create role-based admin system (replaces hardcoded UUIDs)
-- Create enum for roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function (SECURITY DEFINER to bypass RLS and prevent recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
$$;

-- RLS policies for user_roles table (only admins can manage roles)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Seed existing admin users into the new roles table
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('9807c494-ba07-4438-9a89-07ac13334e78'::uuid, 'admin'),
  ('b015441b-3bb4-4150-94e6-d8be048035bb'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix #2: Update settings table policies to use role-based access
DROP POLICY IF EXISTS "Only admin can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Only admin can update settings" ON public.settings;

CREATE POLICY "Only admin can insert settings"
ON public.settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admin can update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix #3: Add missing DELETE policy for settings
CREATE POLICY "Only admin can delete settings"
ON public.settings FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix #4: Update notification_routes policies to use role-based access
DROP POLICY IF EXISTS "Only admin can insert notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can update notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can delete notification routes" ON public.notification_routes;

CREATE POLICY "Only admin can insert notification routes"
ON public.notification_routes FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admin can update notification routes"
ON public.notification_routes FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admin can delete notification routes"
ON public.notification_routes FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Fix #5: Update treasury policies to use role-based access
DROP POLICY IF EXISTS "Admins can manage treasury" ON public.treasury;

CREATE POLICY "Admins can manage treasury"
ON public.treasury FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Fix #6: Add service role check to use_invitation_code function
CREATE OR REPLACE FUNCTION public.use_invitation_code(_code_id uuid, _referrer_id uuid, _referred_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure this function is only called from service role (edge functions)
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'This function can only be called by service role';
  END IF;

  -- Increment used_count
  UPDATE public.invitation_codes
  SET used_count = used_count + 1, updated_at = now()
  WHERE id = _code_id;
  
  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, invitation_code_id)
  VALUES (_referrer_id, _referred_id, _code_id)
  ON CONFLICT (referred_id) DO NOTHING;
  
  -- Mark the referred user as verified
  UPDATE public.profiles
  SET is_verified = true
  WHERE user_id = _referred_id;
  
  -- Create mutual follow: referrer follows referred
  INSERT INTO public.user_connections (follower_id, following_id)
  VALUES (_referrer_id, _referred_id)
  ON CONFLICT DO NOTHING;
  
  -- Create mutual follow: referred follows referrer
  INSERT INTO public.user_connections (follower_id, following_id)
  VALUES (_referred_id, _referrer_id)
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;

-- Fix #7: Tighten overly permissive RLS policies (USING true for INSERT/UPDATE/DELETE)

-- bulletin_reactions: restrict DELETE to prevent abuse
DROP POLICY IF EXISTS "Authenticated users can delete their reactions" ON public.bulletin_reactions;
-- Note: Without user_id column, we can only allow authenticated users. 
-- This table design doesn't track who created reactions, so we keep it as-is for INSERT
-- but remove DELETE entirely to prevent abuse (reactions should be immutable)

-- comments: restrict DELETE to village hosts or comment creator context
DROP POLICY IF EXISTS "Authenticated users can delete comments" ON public.comments;
-- Comments don't have user_id, so we restrict DELETE to village hosts only
CREATE POLICY "Hosts can delete comments"
ON public.comments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM spots s
    JOIN villages v ON v.id = s.village_id
    WHERE s.id = comments.spot_id
    AND (v.created_by = auth.uid() OR public.is_village_host(auth.uid(), v.id))
  )
);

-- proposal_reactions: same approach - remove DELETE to prevent abuse
DROP POLICY IF EXISTS "Authenticated users can delete proposal reactions" ON public.proposal_reactions;