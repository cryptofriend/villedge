-- Update notification_routes RLS to allow village hosts to manage their routes
DROP POLICY IF EXISTS "Only admin can insert notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can update notification routes" ON public.notification_routes;
DROP POLICY IF EXISTS "Only admin can delete notification routes" ON public.notification_routes;

-- Hosts can insert routes for their village
CREATE POLICY "Hosts can insert notification routes" 
ON public.notification_routes 
FOR INSERT 
WITH CHECK (is_village_host(auth.uid(), village_id));

-- Hosts can update routes for their village
CREATE POLICY "Hosts can update notification routes" 
ON public.notification_routes 
FOR UPDATE 
USING (is_village_host(auth.uid(), village_id));

-- Hosts can delete routes for their village
CREATE POLICY "Hosts can delete notification routes" 
ON public.notification_routes 
FOR DELETE 
USING (is_village_host(auth.uid(), village_id));