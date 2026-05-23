
-- Allow authenticated users to read sensitive cols (anonymous remain blocked).
GRANT SELECT (telegram_id, wallet_address) ON public.profiles TO authenticated;
GRANT SELECT (intention, social_profile, offerings, asks, project_description, project_url) ON public.stays TO authenticated;
