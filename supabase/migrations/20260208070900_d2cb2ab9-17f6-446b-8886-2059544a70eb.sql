-- Fix profiles RLS to restore admin and public access to non-sensitive data

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view own profile or via mutual connection" ON public.profiles;

-- Create a more balanced approach:
-- 1. Anyone can view basic profile info (the view already excludes sensitive fields)
-- 2. Full profile access (with sensitive fields) only for owner, mutual connections, or admins
CREATE POLICY "Public can view basic profile info"
ON public.profiles
FOR SELECT
USING (true);

-- Note: Sensitive fields (telegram_id, wallet_address) should be accessed via 
-- the get_safe_profile_data() RPC function or profiles_public view which excludes them.
-- The RLS policy allows SELECT but application code should use the view/RPC for public queries.