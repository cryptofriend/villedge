-- Create spot_joins table to track users joining/marking interest in spots (e.g. housing)
CREATE TABLE public.spot_joins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (spot_id, user_id)
);

CREATE INDEX idx_spot_joins_spot_id ON public.spot_joins(spot_id);
CREATE INDEX idx_spot_joins_user_id ON public.spot_joins(user_id);

ALTER TABLE public.spot_joins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view spot joins"
  ON public.spot_joins
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join spots"
  ON public.spot_joins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave spots"
  ON public.spot_joins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);