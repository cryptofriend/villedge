INSERT INTO public.villages (id, name, logo_url, center, dates, location, description, participants, focus, luma_calendar_id, telegram_url, twitter_url, instagram_url, facebook_url, wallet_address, solana_wallet_address, website_url, apply_url, created_by, created_at, updated_at, village_type, about_content)
SELECT 'renaissance-village', name, logo_url, center, dates, location, description, participants, focus, luma_calendar_id, telegram_url, twitter_url, instagram_url, facebook_url, wallet_address, solana_wallet_address, website_url, apply_url, created_by, created_at, updated_at, village_type, about_content
FROM public.villages WHERE id='suci-super-hub';

UPDATE public.events SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.spots SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.proposals SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.treasury SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.village_application_questions SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.bulletin SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.notification_routes SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.village_hosts SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.residents SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.scenius SET village_id='renaissance-village' WHERE village_id='suci-super-hub';
UPDATE public.stays SET village_id='renaissance-village' WHERE village_id='suci-super-hub';

DELETE FROM public.villages WHERE id='suci-super-hub';