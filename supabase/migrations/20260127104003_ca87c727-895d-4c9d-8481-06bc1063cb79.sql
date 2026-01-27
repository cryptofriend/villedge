-- Create table for multiple social links per user
CREATE TABLE public.profile_social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_social_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view social links"
ON public.profile_social_links
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own social links"
ON public.profile_social_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social links"
ON public.profile_social_links
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social links"
ON public.profile_social_links
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_profile_social_links_user_id ON public.profile_social_links(user_id);