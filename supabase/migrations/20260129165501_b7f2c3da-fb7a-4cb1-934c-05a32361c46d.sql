-- Insert showtime_enabled setting
INSERT INTO public.settings (key, value, description)
VALUES ('showtime_enabled', 'false', 'Toggle Show Time button visibility in the global map header')
ON CONFLICT (key) DO NOTHING;