-- Table to track notified donation transactions (server-side)
CREATE TABLE public.notified_donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_notified_donations_tx_hash ON public.notified_donations(tx_hash);
CREATE INDEX idx_notified_donations_wallet ON public.notified_donations(wallet_address);

-- Allow public insert/select (no RLS needed - this is server-side only)
ALTER TABLE public.notified_donations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access"
ON public.notified_donations
FOR ALL
USING (true)
WITH CHECK (true);