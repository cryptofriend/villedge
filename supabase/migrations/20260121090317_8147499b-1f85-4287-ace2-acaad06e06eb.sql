-- Create stays table for tracking village stays
CREATE TABLE public.stays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id text NOT NULL,
  nickname text NOT NULL,
  villa text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  intention text,
  social_profile text,
  offerings text,
  asks text,
  secret_hash text DEFAULT '',
  is_host boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.stays
  ADD CONSTRAINT stays_village_id_fkey
  FOREIGN KEY (village_id) REFERENCES public.villages(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view stays"
  ON public.stays
  FOR SELECT
  USING (true);

-- Public insert access
CREATE POLICY "Anyone can create stays"
  ON public.stays
  FOR INSERT
  WITH CHECK (true);

-- Public update access (will verify secret_hash in app)
CREATE POLICY "Anyone can update stays"
  ON public.stays
  FOR UPDATE
  USING (true);

-- Public delete access (will verify secret_hash in app)
CREATE POLICY "Anyone can delete stays"
  ON public.stays
  FOR DELETE
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stays;

-- Add index for common queries
CREATE INDEX idx_stays_village_id ON public.stays(village_id);
CREATE INDEX idx_stays_dates ON public.stays(start_date, end_date);