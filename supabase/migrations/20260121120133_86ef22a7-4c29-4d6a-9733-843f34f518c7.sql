-- Create events table for Luma event links
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL,
  luma_url TEXT NOT NULL UNIQUE,
  luma_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can view events
CREATE POLICY "Anyone can view events"
ON public.events
FOR SELECT
USING (true);

-- Anyone can create events
CREATE POLICY "Anyone can create events"
ON public.events
FOR INSERT
WITH CHECK (true);

-- Anyone can delete events
CREATE POLICY "Anyone can delete events"
ON public.events
FOR DELETE
USING (true);

-- Create index for village queries
CREATE INDEX idx_events_village_id ON public.events(village_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);