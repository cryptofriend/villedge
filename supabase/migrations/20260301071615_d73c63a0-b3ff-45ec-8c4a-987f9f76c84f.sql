
CREATE TABLE public.manifesto_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT manifesto_signatures_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.manifesto_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signature count" ON public.manifesto_signatures FOR SELECT USING (true);
CREATE POLICY "Authenticated users can sign" ON public.manifesto_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
