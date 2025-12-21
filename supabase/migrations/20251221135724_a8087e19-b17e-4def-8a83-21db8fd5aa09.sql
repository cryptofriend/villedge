-- Create spots table
CREATE TABLE public.spots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('accommodation', 'food', 'activity', 'work')),
  coordinates JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;

-- Create policies - spots are publicly readable
CREATE POLICY "Anyone can view spots"
ON public.spots
FOR SELECT
USING (true);

-- Anyone can create spots (community-driven)
CREATE POLICY "Anyone can create spots"
ON public.spots
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_spots_updated_at
BEFORE UPDATE ON public.spots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial spots
INSERT INTO public.spots (name, description, category, coordinates, tags) VALUES
('Hacker House', 'Our coworking space with ocean views, high-speed internet, and a vibrant community of digital nomads and founders.', 'work', '[108.2872, 10.9333]', ARRAY['Coworking', 'Community', 'WiFi']),
('Sunrise Beach Café', 'The perfect spot for morning coffee with your feet in the sand. Fresh coconuts and Vietnamese coffee.', 'food', '[108.2912, 10.9315]', ARRAY['Coffee', 'Beach', 'Breakfast']),
('Kite Beach', 'One of the world''s best kitesurfing spots. Consistent winds from November to April. Equipment rental available.', 'activity', '[108.295, 10.928]', ARRAY['Kitesurfing', 'Beach', 'Sports']),
('Popup Village HQ', 'The heart of our community. Weekly events, workshops, and the best sunsets in Mui Ne.', 'accommodation', '[108.289, 10.935]', ARRAY['Events', 'Community', 'Stay']);