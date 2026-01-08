-- Add unique constraint on luma_url for upsert functionality
CREATE UNIQUE INDEX IF NOT EXISTS events_luma_url_unique ON public.events (luma_url) WHERE luma_url IS NOT NULL;