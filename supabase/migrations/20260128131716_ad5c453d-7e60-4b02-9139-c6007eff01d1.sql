-- Add is_verified column to profiles (default false for limited access)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Create invitation_codes table
CREATE TABLE public.invitation_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  max_uses integer NOT NULL DEFAULT 5,
  used_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Policies for invitation_codes
CREATE POLICY "Users can view their own codes"
ON public.invitation_codes
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Verified users can create codes"
ON public.invitation_codes
FOR INSERT
WITH CHECK (
  auth.uid() = owner_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_verified = true
  )
);

CREATE POLICY "Users can update their own codes"
ON public.invitation_codes
FOR UPDATE
USING (auth.uid() = owner_id);

-- Create referrals table to track who invited whom
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  invitation_code_id uuid REFERENCES public.invitation_codes(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies for referrals
CREATE POLICY "Users can view referrals they made or received"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Service role can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK (true);

-- Create function to validate and use invitation code (security definer)
CREATE OR REPLACE FUNCTION public.validate_invitation_code(_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM public.invitation_codes
  WHERE code = _code;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'error', 'Invalid code');
  END IF;
  
  IF code_record.used_count >= code_record.max_uses THEN
    RETURN json_build_object('valid', false, 'error', 'Code has reached maximum uses');
  END IF;
  
  RETURN json_build_object(
    'valid', true, 
    'code_id', code_record.id,
    'owner_id', code_record.owner_id
  );
END;
$$;

-- Create function to use invitation code (increment usage, create referral)
CREATE OR REPLACE FUNCTION public.use_invitation_code(_code_id uuid, _referrer_id uuid, _referred_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  
  RETURN true;
END;
$$;

-- Create function to generate unique invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM public.invitation_codes WHERE code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create index for faster code lookups
CREATE INDEX idx_invitation_codes_code ON public.invitation_codes(code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);

-- Add trigger for updated_at on invitation_codes
CREATE TRIGGER update_invitation_codes_updated_at
BEFORE UPDATE ON public.invitation_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();