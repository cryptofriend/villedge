-- Create notification_routes table to store per-village notification settings
CREATE TABLE public.notification_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'donation', 'bulletin', 'spot', 'resident'
  chat_id TEXT NOT NULL,
  thread_id INTEGER, -- Optional thread/topic ID for supergroups
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(village_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;

-- Anyone can view notification routes
CREATE POLICY "Anyone can view notification routes"
  ON public.notification_routes FOR SELECT
  USING (true);

-- Only admin can insert/update/delete notification routes
CREATE POLICY "Only admin can insert notification routes"
  ON public.notification_routes FOR INSERT
  WITH CHECK (auth.uid() = 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid);

CREATE POLICY "Only admin can update notification routes"
  ON public.notification_routes FOR UPDATE
  USING (auth.uid() = 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid);

CREATE POLICY "Only admin can delete notification routes"
  ON public.notification_routes FOR DELETE
  USING (auth.uid() = 'b015441b-3bb4-4150-94e6-d8be048035bb'::uuid);

-- Add trigger for updated_at
CREATE TRIGGER update_notification_routes_updated_at
  BEFORE UPDATE ON public.notification_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data for proof-of-retreat bulletin
INSERT INTO public.notification_routes (village_id, notification_type, chat_id, thread_id, is_enabled)
VALUES ('proof-of-retreat', 'bulletin', '-1003580489932', 734, true);