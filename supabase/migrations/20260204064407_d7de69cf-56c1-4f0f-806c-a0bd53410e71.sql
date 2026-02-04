-- Create table to store Telegram notification subscriptions for stay applications
CREATE TABLE public.stay_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id uuid NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
  telegram_chat_id text NOT NULL,
  telegram_username text,
  subscribed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(stay_id)
);

-- Enable RLS
ALTER TABLE public.stay_notifications ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for webhook edge function)
CREATE POLICY "Service role full access"
ON public.stay_notifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Users can view their own stay notifications
CREATE POLICY "Users can view their own stay notifications"
ON public.stay_notifications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stays s
  WHERE s.id = stay_notifications.stay_id
  AND s.user_id = auth.uid()
));

-- Hosts can view notifications for their village's stays
CREATE POLICY "Hosts can view village stay notifications"
ON public.stay_notifications
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM stays s
  WHERE s.id = stay_notifications.stay_id
  AND is_village_host(auth.uid(), s.village_id)
));