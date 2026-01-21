-- Create webauthn schema
CREATE SCHEMA IF NOT EXISTS webauthn;

-- Create credential type enums
CREATE TYPE webauthn.credential_type AS ENUM ('public-key');
CREATE TYPE webauthn.user_verification_status AS ENUM ('unverified', 'verified');
CREATE TYPE webauthn.device_type AS ENUM ('single_device', 'multi_device');
CREATE TYPE webauthn.backup_state AS ENUM ('not_backed_up', 'backed_up');

-- Create credentials table to store passkey data
CREATE TABLE webauthn.credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friendly_name TEXT,
  credential_type webauthn.credential_type NOT NULL DEFAULT 'public-key',
  credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  aaguid TEXT DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  user_verification_status webauthn.user_verification_status NOT NULL DEFAULT 'unverified',
  device_type webauthn.device_type NOT NULL DEFAULT 'single_device',
  backup_state webauthn.backup_state NOT NULL DEFAULT 'not_backed_up',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_used_at TIMESTAMPTZ,
  CONSTRAINT credentials_pkey PRIMARY KEY (id),
  CONSTRAINT credentials_credential_id_key UNIQUE (credential_id),
  CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create challenges table to store temporary authentication challenges
CREATE TABLE webauthn.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  email TEXT NULL,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'registration',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT challenges_pkey PRIMARY KEY (id),
  CONSTRAINT challenges_challenge_key UNIQUE (challenge),
  CONSTRAINT challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX credentials_user_id_idx ON webauthn.credentials (user_id);
CREATE INDEX challenges_expires_at_idx ON webauthn.challenges (expires_at);

-- Enable RLS
ALTER TABLE webauthn.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn.challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credentials - users can only see their own
CREATE POLICY "Users can view their own credentials"
ON webauthn.credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
ON webauthn.credentials
FOR DELETE
USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to credentials"
ON webauthn.credentials
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to challenges"
ON webauthn.challenges
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow anonymous users to insert challenges for registration
CREATE POLICY "Anyone can insert challenges"
ON webauthn.challenges
FOR INSERT
WITH CHECK (true);

-- Clean up expired challenges automatically via function
CREATE OR REPLACE FUNCTION webauthn.cleanup_expired_challenges()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = webauthn
AS $$
  DELETE FROM webauthn.challenges WHERE expires_at < now();
$$;