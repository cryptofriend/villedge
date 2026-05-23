
-- ============================================
-- PROFILES: revoke sensitive columns from public/auth roles
-- get_safe_profile_data() RPC remains the privileged path
-- ============================================
REVOKE SELECT (telegram_id, wallet_address) ON public.profiles FROM anon, authenticated;

-- ============================================
-- STAYS: revoke sensitive personal columns
-- get_stays_with_privacy() RPC remains the privileged path
-- ============================================
REVOKE SELECT (intention, social_profile, offerings, asks, project_description, project_url, secret_hash)
  ON public.stays FROM anon, authenticated;

-- ============================================
-- USER_WALLETS: lock SELECT to owner + admin
-- ============================================
DROP POLICY IF EXISTS "Anyone can view wallets" ON public.user_wallets;

CREATE POLICY "Users can view their own wallets"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
  ON public.user_wallets FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Server-side wallet→owner lookup for identity flows
CREATE OR REPLACE FUNCTION public.resolve_wallet_owner(_wallet_address text, _wallet_type wallet_type)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.user_wallets
  WHERE wallet_address = _wallet_address
    AND wallet_type = _wallet_type
  LIMIT 1;
$$;

-- ============================================
-- ROOM_BOOKINGS: lock SELECT to participants + spot manager
-- Public availability via SECURITY DEFINER RPC (no user_id / notes)
-- ============================================
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.room_bookings;

CREATE POLICY "Participants and managers can view bookings"
  ON public.room_bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.housing_rooms r
      WHERE r.id = room_bookings.room_id
        AND public.can_manage_spot(auth.uid(), r.spot_id)
    )
  );

CREATE OR REPLACE FUNCTION public.get_room_availability(_room_ids uuid[])
RETURNS TABLE(
  id uuid,
  room_id uuid,
  start_date date,
  end_date date,
  status text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.room_id, b.start_date, b.end_date, b.status, p.username, p.avatar_url
  FROM public.room_bookings b
  LEFT JOIN public.profiles p ON p.user_id = b.user_id
  WHERE b.room_id = ANY(_room_ids)
    AND b.status IN ('confirmed', 'pending')
  ORDER BY b.start_date ASC;
$$;
