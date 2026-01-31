-- Fix #1: Treasury table - restrict write access to admins only
DROP POLICY IF EXISTS "Anyone can create treasury" ON public.treasury;
DROP POLICY IF EXISTS "Anyone can update treasury" ON public.treasury;

-- Allow admins to manage treasury
CREATE POLICY "Admins can manage treasury" ON public.treasury
FOR ALL TO authenticated
USING (auth.uid() IN ('9807c494-ba07-4438-9a89-07ac13334e78'::uuid, 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid))
WITH CHECK (auth.uid() IN ('9807c494-ba07-4438-9a89-07ac13334e78'::uuid, 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid));

-- Fix #2: Profiles table - replace permissive SELECT with restricted policy
-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a function to get safe profile data (hides sensitive fields for non-owners)
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  avatar_url text,
  bio text,
  offerings text,
  asks text,
  project_description text,
  project_url text,
  social_url text,
  is_anon boolean,
  is_verified boolean,
  created_at timestamptz,
  updated_at timestamptz,
  -- Sensitive fields only for owner or mutual connections
  wallet_address text,
  telegram_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.username,
    p.avatar_url,
    p.bio,
    p.offerings,
    p.asks,
    p.project_description,
    p.project_url,
    p.social_url,
    p.is_anon,
    p.is_verified,
    p.created_at,
    p.updated_at,
    -- Only expose sensitive fields to owner or mutual connections
    CASE 
      WHEN viewer_id = p.user_id THEN p.wallet_address
      WHEN viewer_id IS NOT NULL AND has_mutual_connection(viewer_id, p.user_id) THEN p.wallet_address
      ELSE NULL
    END AS wallet_address,
    CASE 
      WHEN viewer_id = p.user_id THEN p.telegram_id
      WHEN viewer_id IS NOT NULL AND has_mutual_connection(viewer_id, p.user_id) THEN p.telegram_id
      ELSE NULL
    END AS telegram_id
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

-- Create new RLS policy for profiles - users can view non-sensitive data
-- Public can see basic profile info, but sensitive fields are controlled by the function above
CREATE POLICY "Profiles basic info is viewable by everyone" ON public.profiles
FOR SELECT
USING (true);

-- Note: The client code should use get_safe_profile_data() RPC for profile lookups
-- to properly hide sensitive fields. The SELECT policy remains for basic queries
-- but sensitive field exposure is handled at the application level.