-- Create table for bulletin reactions
CREATE TABLE public.bulletin_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_id UUID NOT NULL REFERENCES public.bulletin(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Use a unique constraint on bulletin_id + reaction_type + a session identifier
  -- For anonymous reactions, we'll use a simple approach
  CONSTRAINT valid_reaction_type CHECK (reaction_type IN ('support', 'in', 'cute'))
);

-- Enable RLS
ALTER TABLE public.bulletin_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view reactions"
ON public.bulletin_reactions
FOR SELECT
USING (true);

-- Anyone can add reactions
CREATE POLICY "Anyone can add reactions"
ON public.bulletin_reactions
FOR INSERT
WITH CHECK (true);

-- Anyone can remove reactions
CREATE POLICY "Anyone can delete reactions"
ON public.bulletin_reactions
FOR DELETE
USING (true);