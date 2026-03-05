-- Fix incorrect coordinates for permanent villages stuck in SEA
UPDATE villages SET center = '[79.8083, 12.0057]' WHERE id = 'auroville';
UPDATE villages SET center = '[-82.5515, 35.4371]' WHERE id = 'earthaven-ecovillage';
UPDATE villages SET center = '[-3.6169, 57.6606]' WHERE id = 'findhorn-ecovillage';
UPDATE villages SET center = '[172.8613, -40.8238]' WHERE id = 'tui-community';
UPDATE villages SET center = '[106.6297, 10.8231]' WHERE id = 'suci-super-hub';