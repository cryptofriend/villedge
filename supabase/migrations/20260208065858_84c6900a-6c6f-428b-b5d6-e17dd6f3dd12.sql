-- =====================================================
-- SECURITY FIX: Protect sensitive user data from harvesting
-- =====================================================

-- 1. Create a PUBLIC VIEW for profiles that excludes sensitive fields
-- This view is what the app should use for public-facing queries
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  username,
  avatar_url,
  bio,
  offerings,
  asks,
  project_description,
  project_url,
  social_url,
  is_anon,
  is_verified,
  created_at,
  updated_at
  -- EXCLUDED: telegram_id, wallet_address (sensitive PII)
FROM public.profiles;

-- Grant access to the public view
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 2. Update profiles SELECT policy to restrict access to sensitive fields
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles basic info is viewable by everyone" ON public.profiles;

-- Create a new restrictive policy: only owner, mutual connections, or approved reveals can see full profile
CREATE POLICY "Users can view own profile or via mutual connection"
ON public.profiles
FOR SELECT
USING (
  -- Owner can always see their own profile
  auth.uid() = user_id
  OR
  -- Mutual connection grants full access
  (auth.uid() IS NOT NULL AND has_mutual_connection(auth.uid(), user_id))
  OR
  -- Approved reveal request grants full access
  (auth.uid() IS NOT NULL AND has_approved_reveal(auth.uid(), user_id))
);

-- 3. Fix stay_application_answers - restrict to hosts and applicant only
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view answers" ON public.stay_application_answers;

-- Create restrictive policy: only hosts or the stay owner can view answers
CREATE POLICY "Hosts and applicants can view answers"
ON public.stay_application_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM stays s
    WHERE s.id = stay_application_answers.stay_id
    AND (
      -- The applicant can see their own answers
      s.user_id = auth.uid()
      OR
      -- Village hosts can see all application answers for their village
      is_village_host(auth.uid(), s.village_id)
    )
  )
);

-- 4. BONUS: Fix proposals DELETE policy (another security issue found)
DROP POLICY IF EXISTS "Hosts can delete proposals in their village" ON public.proposals;

CREATE POLICY "Hosts can delete proposals in their village"
ON public.proposals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM villages
    WHERE villages.id = proposals.village_id
    AND (villages.created_by = auth.uid() OR is_village_host(auth.uid(), villages.id))
  )
);