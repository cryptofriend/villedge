
CREATE TABLE public.booking_relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE,
  village_id text,
  host_user_id uuid,
  booker_user_id uuid NOT NULL,
  host_chat_id text,
  booker_chat_id text,
  status text NOT NULL DEFAULT 'active',
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_relays_host_chat ON public.booking_relays(host_chat_id) WHERE host_chat_id IS NOT NULL;
CREATE INDEX idx_booking_relays_booker_chat ON public.booking_relays(booker_chat_id) WHERE booker_chat_id IS NOT NULL;

ALTER TABLE public.booking_relays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their relays"
ON public.booking_relays FOR SELECT
USING (auth.uid() = booker_user_id OR auth.uid() = host_user_id);

CREATE TRIGGER set_booking_relays_updated_at
BEFORE UPDATE ON public.booking_relays
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
