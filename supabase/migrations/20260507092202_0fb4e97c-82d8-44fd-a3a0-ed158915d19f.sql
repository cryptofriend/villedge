
-- Rooms inside a housing spot
CREATE TABLE public.housing_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  capacity INTEGER NOT NULL DEFAULT 1,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_housing_rooms_spot ON public.housing_rooms(spot_id);

ALTER TABLE public.housing_rooms ENABLE ROW LEVEL SECURITY;

-- Helper: is the auth user the spot creator or a host of the spot's village
CREATE OR REPLACE FUNCTION public.can_manage_spot(_user_id uuid, _spot_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s
    WHERE s.id = _spot_id
      AND (
        s.created_by = _user_id
        OR (s.village_id IS NOT NULL AND public.is_village_host(_user_id, s.village_id))
      )
  )
$$;

CREATE POLICY "Anyone can view rooms"
  ON public.housing_rooms FOR SELECT USING (true);

CREATE POLICY "Spot creator/host can insert rooms"
  ON public.housing_rooms FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_spot(auth.uid(), spot_id));

CREATE POLICY "Spot creator/host can update rooms"
  ON public.housing_rooms FOR UPDATE TO authenticated
  USING (public.can_manage_spot(auth.uid(), spot_id));

CREATE POLICY "Spot creator/host can delete rooms"
  ON public.housing_rooms FOR DELETE TO authenticated
  USING (public.can_manage_spot(auth.uid(), spot_id));

CREATE TRIGGER update_housing_rooms_updated_at
  BEFORE UPDATE ON public.housing_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookings
CREATE TABLE public.room_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.housing_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_bookings_room ON public.room_bookings(room_id);
CREATE INDEX idx_room_bookings_user ON public.room_bookings(user_id);

ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;

-- Validate dates and prevent overlap (active bookings only)
CREATE OR REPLACE FUNCTION public.check_room_booking_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'end_date must be after start_date';
  END IF;

  IF NEW.status IN ('confirmed', 'pending') THEN
    IF EXISTS (
      SELECT 1 FROM public.room_bookings b
      WHERE b.room_id = NEW.room_id
        AND b.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND b.status IN ('confirmed', 'pending')
        AND daterange(b.start_date, b.end_date, '[)') && daterange(NEW.start_date, NEW.end_date, '[)')
    ) THEN
      RAISE EXCEPTION 'Room is already booked for the selected dates';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER room_bookings_check_overlap
  BEFORE INSERT OR UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_room_booking_overlap();

CREATE TRIGGER update_room_bookings_updated_at
  BEFORE UPDATE ON public.room_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone can view bookings"
  ON public.room_bookings FOR SELECT USING (true);

CREATE POLICY "Users can create their own bookings"
  ON public.room_bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Booker or host can update bookings"
  ON public.room_bookings FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.housing_rooms r
      WHERE r.id = room_bookings.room_id
        AND public.can_manage_spot(auth.uid(), r.spot_id)
    )
  );

CREATE POLICY "Booker or host can delete bookings"
  ON public.room_bookings FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.housing_rooms r
      WHERE r.id = room_bookings.room_id
        AND public.can_manage_spot(auth.uid(), r.spot_id)
    )
  );
