
-- Table to track two-step /addvillage flow in Telegram
-- Stores scraped data while waiting for user to provide a maps link
CREATE TABLE public.pending_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  username text,
  scraped_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'awaiting_location',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-cleanup old pending entries (older than 1 hour)
CREATE INDEX idx_pending_villages_chat_id ON public.pending_villages (chat_id);
CREATE INDEX idx_pending_villages_created_at ON public.pending_villages (created_at);

-- Enable RLS
ALTER TABLE public.pending_villages ENABLE ROW LEVEL SECURITY;

-- Only service role needs access (edge functions)
CREATE POLICY "Service role full access"
ON public.pending_villages
FOR ALL
USING (true)
WITH CHECK (true);
