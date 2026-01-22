-- Add social link columns to villages table
ALTER TABLE public.villages
ADD COLUMN telegram_url TEXT,
ADD COLUMN twitter_url TEXT,
ADD COLUMN instagram_url TEXT;