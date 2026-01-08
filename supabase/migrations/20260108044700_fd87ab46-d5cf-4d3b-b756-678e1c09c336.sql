-- Drop the partial unique index and add a proper unique constraint
DROP INDEX IF EXISTS events_luma_url_unique;
ALTER TABLE public.events ADD CONSTRAINT events_luma_url_key UNIQUE (luma_url);