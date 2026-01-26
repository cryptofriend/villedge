-- Update RLS policies to use new admin user ID
DROP POLICY IF EXISTS "Only admin can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Only admin can update settings" ON public.settings;
DROP POLICY IF EXISTS "Only admin can insert notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can update notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can delete notification routes" ON public.notification_routes;

CREATE POLICY "Only admin can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

CREATE POLICY "Only admin can update settings" 
ON public.settings 
FOR UPDATE 
USING (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

CREATE POLICY "Only admin can insert notification routes" 
ON public.notification_routes 
FOR INSERT 
WITH CHECK (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

CREATE POLICY "Only admin can update notification routes" 
ON public.notification_routes 
FOR UPDATE 
USING (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

CREATE POLICY "Only admin can delete notification routes" 
ON public.notification_routes 
FOR DELETE 
USING (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);