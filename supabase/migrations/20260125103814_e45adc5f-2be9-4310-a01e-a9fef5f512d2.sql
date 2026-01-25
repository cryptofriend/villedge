-- Create settings table for admin-configurable values
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (edge functions need this)
CREATE POLICY "Anyone can view settings"
ON public.settings FOR SELECT
USING (true);

-- Only Booga can update settings
CREATE POLICY "Only admin can update settings"
ON public.settings FOR UPDATE
USING (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

CREATE POLICY "Only admin can insert settings"
ON public.settings FOR INSERT
WITH CHECK (auth.uid() = '9807c494-ba07-4438-9a89-07ac13334e78'::uuid);

-- Insert default Telegram Chat ID (can be updated later)
INSERT INTO public.settings (key, value, description)
VALUES ('telegram_chat_id', '', 'Telegram Chat ID for notifications');