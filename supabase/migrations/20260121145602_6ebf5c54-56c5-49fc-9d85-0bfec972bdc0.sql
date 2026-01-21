-- Create credentials table in public schema
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friendly_name TEXT,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0,
  device_type TEXT,
  backup_state TEXT,
  user_verification_status TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Create challenges table in public schema
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  email TEXT NULL,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'registration',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for credentials
CREATE POLICY "Service role has full access to credentials"
ON public.webauthn_credentials FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own credentials"
ON public.webauthn_credentials FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS policies for challenges
CREATE POLICY "Service role has full access to challenges"
ON public.webauthn_challenges FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert challenges"
ON public.webauthn_challenges FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
END;
$$;