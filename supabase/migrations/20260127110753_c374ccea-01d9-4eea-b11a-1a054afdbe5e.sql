-- Create table for user projects (multiple per user)
CREATE TABLE public.user_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  favicon_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Anyone can view projects
CREATE POLICY "Anyone can view user projects"
ON public.user_projects
FOR SELECT
USING (true);

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
ON public.user_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
ON public.user_projects
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.user_projects
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_projects_updated_at
BEFORE UPDATE ON public.user_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();