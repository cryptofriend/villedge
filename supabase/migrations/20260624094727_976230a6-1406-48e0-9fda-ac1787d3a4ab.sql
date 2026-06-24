
CREATE TABLE public.festivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT,
  city TEXT,
  location_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  start_date DATE,
  end_date DATE,
  year INTEGER,
  website_url TEXT,
  logo_url TEXT,
  genres TEXT[] DEFAULT '{}'::text[],
  lineup_summary TEXT,
  description TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX festivals_start_date_idx ON public.festivals (start_date);
CREATE INDEX festivals_country_idx ON public.festivals (country);

GRANT SELECT ON public.festivals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festivals TO authenticated;
GRANT ALL ON public.festivals TO service_role;

ALTER TABLE public.festivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Festivals are viewable by everyone"
  ON public.festivals FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert festivals"
  ON public.festivals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update festivals"
  ON public.festivals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete festivals"
  ON public.festivals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_festivals_updated_at
  BEFORE UPDATE ON public.festivals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
