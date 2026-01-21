-- Create villages table (replaces hardcoded POPUP_VILLAGES)
CREATE TABLE public.villages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  center JSONB NOT NULL, -- [lng, lat] coordinates
  dates TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  participants TEXT,
  focus TEXT,
  luma_calendar_id TEXT, -- For Luma integration
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for villages
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;

-- Villages are publicly readable
CREATE POLICY "Anyone can view villages" ON public.villages
FOR SELECT USING (true);

-- Anyone can manage villages (no auth for now)
CREATE POLICY "Anyone can create villages" ON public.villages
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update villages" ON public.villages
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete villages" ON public.villages
FOR DELETE USING (true);

-- Create residents table (extended profile)
CREATE TABLE public.residents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  twitter_url TEXT,
  github_url TEXT,
  website_url TEXT,
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  looking_for TEXT, -- What they're looking to collaborate on
  offering TEXT, -- What they can offer
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for residents
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view residents" ON public.residents
FOR SELECT USING (true);

CREATE POLICY "Anyone can create residents" ON public.residents
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update residents" ON public.residents
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete residents" ON public.residents
FOR DELETE USING (true);

-- Create scenius table (projects/collaborative work)
CREATE TABLE public.scenius (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL REFERENCES public.villages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  github_url TEXT,
  tags TEXT[] DEFAULT '{}',
  contributors UUID[] DEFAULT '{}', -- References resident IDs
  status TEXT DEFAULT 'active' CHECK (status IN ('idea', 'active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for scenius
ALTER TABLE public.scenius ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scenius" ON public.scenius
FOR SELECT USING (true);

CREATE POLICY "Anyone can create scenius" ON public.scenius
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update scenius" ON public.scenius
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete scenius" ON public.scenius
FOR DELETE USING (true);

-- Update spots table to reference villages
ALTER TABLE public.spots ADD COLUMN village_id TEXT REFERENCES public.villages(id) ON DELETE SET NULL;

-- Create triggers for updated_at
CREATE TRIGGER update_villages_updated_at
BEFORE UPDATE ON public.villages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_residents_updated_at
BEFORE UPDATE ON public.residents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenius_updated_at
BEFORE UPDATE ON public.scenius
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop events table (user confirmed removal)
DROP TABLE IF EXISTS public.events CASCADE;