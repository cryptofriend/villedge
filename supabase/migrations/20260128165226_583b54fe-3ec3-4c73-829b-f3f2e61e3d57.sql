-- Update the check constraint to allow 'conference' as a village type
ALTER TABLE public.villages DROP CONSTRAINT IF EXISTS villages_village_type_check;
ALTER TABLE public.villages ADD CONSTRAINT villages_village_type_check CHECK (village_type IN ('popup', 'permanent', 'conference'));

-- Insert Ethereum conferences as villages
INSERT INTO public.villages (id, name, location, dates, description, center, village_type, website_url) VALUES
('ethdenver-2025', 'ETHDenver', 'Denver, USA', 'Feb 17-21, 2025', 'The largest and longest-running ETH event in the world', '[-104.9903, 39.7392]', 'conference', 'https://www.ethdenver.com/'),
('ethcc-2025', 'ETHCC', 'Cannes, France', 'Mar 30 - Apr 2, 2025', 'The Ethereum Community Conference', '[7.0128, 43.5528]', 'conference', 'https://ethcc.io/'),
('consensus-hk-2025', 'Consensus HK', 'Hong Kong', 'Feb 10-12, 2025', 'Consensus Hong Kong conference', '[114.1694, 22.3193]', 'conference', 'https://consensus-hongkong2025.coindesk.com/'),
('eth-seoul-2025', 'ETH Seoul', 'Seoul, Korea', 'Apr 1, 2025', 'Ethereum Seoul conference', '[126.9780, 37.5665]', 'conference', 'https://ethseoul.org/'),
('eth-mumbai-2025', 'ETHMumbai', 'Mumbai, India', 'Mar 12-15, 2025', 'Ethereum India conference and hackathon', '[72.8777, 19.0760]', 'conference', 'https://ethindia.co/'),
('devconnect-2025', 'Devconnect', 'Buenos Aires, Argentina', 'Nov 2025', 'Week-long gathering for Ethereum builders', '[-58.3816, -34.6037]', 'conference', 'https://devconnect.org/'),
('ethglobal-cannes-2025', 'ETHGlobal Cannes', 'Cannes, France', 'Apr 3-5, 2025', 'ETHGlobal hackathon in Cannes', '[7.0128, 43.5528]', 'conference', 'https://ethglobal.com/')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  dates = EXCLUDED.dates,
  description = EXCLUDED.description,
  center = EXCLUDED.center,
  village_type = EXCLUDED.village_type,
  website_url = EXCLUDED.website_url;