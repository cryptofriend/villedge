
-- 1. Fix spot-images storage bucket: restrict DELETE/UPDATE to authenticated owners
DROP POLICY IF EXISTS "Anyone can update spot images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete spot images" ON storage.objects;
DROP POLICY IF EXISTS "Public can update spot-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete spot-images" ON storage.objects;

CREATE POLICY "Authenticated users can update spot-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'spot-images' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'spot-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete spot-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'spot-images' AND auth.uid() IS NOT NULL);

-- 2. Fix villages bot_token exposure via column-level privileges
-- The OR-permissive issue: drop dual policies and keep one public policy,
-- but revoke direct column access to bot_token from anon/authenticated.
DROP POLICY IF EXISTS "Only hosts can view bot_token" ON public.villages;

REVOKE SELECT (bot_token, bot_token_secret_name) ON public.villages FROM anon, authenticated;

-- 3. Fix "service role" policies that actually apply to public
DROP POLICY IF EXISTS "Service role full access" ON public.notified_donations;
CREATE POLICY "Service role full access"
ON public.notified_donations FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.pending_villages;
CREATE POLICY "Service role full access"
ON public.pending_villages FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON public.stay_notifications;
CREATE POLICY "Service role full access"
ON public.stay_notifications FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 4. Fix stay_application_answers: restrict INSERT to authenticated stay owners
DROP POLICY IF EXISTS "Authenticated users can insert answers" ON public.stay_application_answers;
CREATE POLICY "Stay owners can insert answers"
ON public.stay_application_answers FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stays s
    WHERE s.id = stay_application_answers.stay_id
      AND s.user_id = auth.uid()
  )
);

-- 5. Restrict notification_routes SELECT to hosts and admins
DROP POLICY IF EXISTS "Anyone can view notification routes" ON public.notification_routes;
CREATE POLICY "Hosts and admins can view notification routes"
ON public.notification_routes FOR SELECT TO authenticated
USING (is_village_host(auth.uid(), village_id) OR is_admin(auth.uid()));
