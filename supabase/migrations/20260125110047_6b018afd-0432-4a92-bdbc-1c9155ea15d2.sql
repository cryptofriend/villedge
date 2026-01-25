-- Update RLS policies for settings table to use correct Booga user ID

-- Drop existing policies
DROP POLICY IF EXISTS "Only admin can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Only admin can update settings" ON public.settings;

-- Recreate with correct user ID
CREATE POLICY "Only admin can insert settings" 
ON public.settings 
FOR INSERT 
WITH CHECK (auth.uid() = 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid);

CREATE POLICY "Only admin can update settings" 
ON public.settings 
FOR UPDATE 
USING (auth.uid() = 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid);