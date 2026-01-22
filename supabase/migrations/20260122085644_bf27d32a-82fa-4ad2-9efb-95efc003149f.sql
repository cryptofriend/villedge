-- Create treasury table to store village treasury balance
CREATE TABLE public.treasury (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(village_id)
);

-- Enable RLS
ALTER TABLE public.treasury ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view treasury" ON public.treasury FOR SELECT USING (true);
CREATE POLICY "Anyone can create treasury" ON public.treasury FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update treasury" ON public.treasury FOR UPDATE USING (true);

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12, 2),
  author_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view proposals" ON public.proposals FOR SELECT USING (true);
CREATE POLICY "Anyone can create proposals" ON public.proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete proposals" ON public.proposals FOR DELETE USING (true);

-- Create proposal reactions table
CREATE TABLE public.proposal_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fund', 'later', 'no_fund')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view proposal reactions" ON public.proposal_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can add proposal reactions" ON public.proposal_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete proposal reactions" ON public.proposal_reactions FOR DELETE USING (true);

-- Add updated_at trigger for treasury
CREATE TRIGGER update_treasury_updated_at
BEFORE UPDATE ON public.treasury
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();