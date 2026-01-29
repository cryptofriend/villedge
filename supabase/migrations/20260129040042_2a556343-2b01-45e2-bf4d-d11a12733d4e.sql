-- Update use_invitation_code function to create mutual follows
CREATE OR REPLACE FUNCTION public.use_invitation_code(_code_id uuid, _referrer_id uuid, _referred_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;