-- Drop the existing category check constraint
ALTER TABLE public.spots DROP CONSTRAINT IF EXISTS spots_category_check;

-- Add updated check constraint with shopping category
ALTER TABLE public.spots ADD CONSTRAINT spots_category_check 
CHECK (category IN ('accommodation', 'food', 'activity', 'work', 'atm', 'shopping'));