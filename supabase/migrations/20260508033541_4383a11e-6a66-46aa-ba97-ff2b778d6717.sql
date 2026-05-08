
DO $$
DECLARE
  old_id text := 'zuzalu-city-japan-a-coliving-neighborhood-for-nomads-entrepreneurs-and-artists';
  new_id text := 'zuzalu-city-japan';
BEGIN
  INSERT INTO public.villages (id, name, logo_url, center, dates, location, description, participants, focus, luma_calendar_id, telegram_url, twitter_url, instagram_url, facebook_url, wallet_address, solana_wallet_address, website_url, apply_url, created_by, created_at, updated_at, village_type, about_content)
  SELECT new_id, name, logo_url, center, dates, location, description, participants, focus, luma_calendar_id, telegram_url, twitter_url, instagram_url, facebook_url, wallet_address, solana_wallet_address, website_url, apply_url, created_by, created_at, updated_at, village_type, about_content
  FROM public.villages WHERE id = old_id;

  UPDATE public.booking_relays SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.bulletin SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.events SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.notification_routes SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.proposals SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.residents SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.scenius SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.spots SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.stays SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.treasury SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.village_application_questions SET village_id = new_id WHERE village_id = old_id;
  UPDATE public.village_hosts SET village_id = new_id WHERE village_id = old_id;

  DELETE FROM public.villages WHERE id = old_id;
END $$;
