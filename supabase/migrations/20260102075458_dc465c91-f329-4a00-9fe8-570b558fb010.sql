-- Drop the existing check constraint and add a new one that includes 'atm'
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_category_check;

ALTER TABLE public.spots ADD CONSTRAINT spots_category_check 
  CHECK (category IN ('accommodation', 'food', 'activity', 'work', 'atm'));