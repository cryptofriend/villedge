-- Create bulletin table for public messages
CREATE TABLE public.bulletin (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulletin ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view bulletin messages"
  ON public.bulletin FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create bulletin messages"
  ON public.bulletin FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete bulletin messages"
  ON public.bulletin FOR DELETE
  USING (true);