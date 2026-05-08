
-- ============ NOTIFICATIONS TABLE ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  actor_id uuid,
  type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  parent_entity_type text,
  parent_entity_id text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_created ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- No INSERT policy: only SECURITY DEFINER triggers write.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============ PREFERENCES ============
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  telegram boolean NOT NULL DEFAULT false,
  email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ HELPER ============
CREATE OR REPLACE FUNCTION public.create_notification(
  _recipient_id uuid,
  _actor_id uuid,
  _type text,
  _entity_type text,
  _entity_id text,
  _parent_entity_type text DEFAULT NULL,
  _parent_entity_id text DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _recipient_id IS NULL THEN RETURN; END IF;
  IF _actor_id IS NOT NULL AND _actor_id = _recipient_id THEN RETURN; END IF;

  INSERT INTO public.notifications
    (recipient_id, actor_id, type, entity_type, entity_id, parent_entity_type, parent_entity_id, data)
  VALUES
    (_recipient_id, _actor_id, _type, _entity_type, _entity_id, _parent_entity_type, _parent_entity_id, _data);
END;
$$;

-- Helper to get all hosts of a village
CREATE OR REPLACE FUNCTION public.get_village_host_ids(_village_id text)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT created_by FROM public.villages WHERE id = _village_id AND created_by IS NOT NULL
  UNION
  SELECT user_id FROM public.village_hosts WHERE village_id = _village_id;
$$;

-- ============ TRIGGER FUNCTIONS ============

-- spot_joins
CREATE OR REPLACE FUNCTION public.notify_spot_joined()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT id, name, created_by, village_id INTO s FROM public.spots WHERE id = NEW.spot_id;
  payload := jsonb_build_object('spot_name', s.name, 'spot_id', s.id);

  IF s.created_by IS NOT NULL THEN
    PERFORM public.create_notification(s.created_by, NEW.user_id, 'spot.joined', 'spot', s.id::text, 'village', s.village_id, payload);
  END IF;

  IF s.village_id IS NOT NULL THEN
    FOR host_id IN SELECT public.get_village_host_ids(s.village_id) LOOP
      IF host_id <> COALESCE(s.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.create_notification(host_id, NEW.user_id, 'spot.joined', 'spot', s.id::text, 'village', s.village_id, payload);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_spot_joined AFTER INSERT ON public.spot_joins
FOR EACH ROW EXECUTE FUNCTION public.notify_spot_joined();

-- comments on spots
CREATE OR REPLACE FUNCTION public.notify_spot_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT id, name, created_by, village_id INTO s FROM public.spots WHERE id = NEW.spot_id;
  payload := jsonb_build_object('spot_name', s.name, 'author_name', NEW.author_name, 'excerpt', left(NEW.content, 140));

  IF s.created_by IS NOT NULL THEN
    PERFORM public.create_notification(s.created_by, auth.uid(), 'spot.commented', 'spot', s.id::text, 'village', s.village_id, payload);
  END IF;

  IF s.village_id IS NOT NULL THEN
    FOR host_id IN SELECT public.get_village_host_ids(s.village_id) LOOP
      IF host_id <> COALESCE(s.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.create_notification(host_id, auth.uid(), 'spot.commented', 'spot', s.id::text, 'village', s.village_id, payload);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_spot_comment AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_spot_comment();

-- room_bookings
CREATE OR REPLACE FUNCTION public.notify_room_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT hr.id AS room_id, hr.name AS room_name, hr.spot_id, s.name AS spot_name, s.created_by AS spot_creator, s.village_id
  INTO r
  FROM public.housing_rooms hr
  JOIN public.spots s ON s.id = hr.spot_id
  WHERE hr.id = NEW.room_id;

  payload := jsonb_build_object('room_name', r.room_name, 'spot_name', r.spot_name,
    'start_date', NEW.start_date, 'end_date', NEW.end_date, 'status', NEW.status);

  IF r.spot_creator IS NOT NULL THEN
    PERFORM public.create_notification(r.spot_creator, NEW.user_id, 'housing.booked', 'room_booking', NEW.id::text, 'spot', r.spot_id::text, payload);
  END IF;

  IF r.village_id IS NOT NULL THEN
    FOR host_id IN SELECT public.get_village_host_ids(r.village_id) LOOP
      IF host_id <> COALESCE(r.spot_creator, '00000000-0000-0000-0000-000000000000'::uuid) THEN
        PERFORM public.create_notification(host_id, NEW.user_id, 'housing.booked', 'room_booking', NEW.id::text, 'spot', r.spot_id::text, payload);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_room_booking AFTER INSERT ON public.room_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_room_booking();

-- stays (applications)
CREATE OR REPLACE FUNCTION public.notify_stay_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT id, name INTO v FROM public.villages WHERE id = NEW.village_id;
  payload := jsonb_build_object('village_name', v.name, 'nickname', NEW.nickname,
    'start_date', NEW.start_date, 'end_date', NEW.end_date, 'status', NEW.status);

  FOR host_id IN SELECT public.get_village_host_ids(NEW.village_id) LOOP
    PERFORM public.create_notification(host_id, NEW.user_id, 'village.application_received', 'stay', NEW.id::text, 'village', NEW.village_id, payload);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_stay_created AFTER INSERT ON public.stays
FOR EACH ROW EXECUTE FUNCTION public.notify_stay_created();

-- events
CREATE OR REPLACE FUNCTION public.notify_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT id, name INTO v FROM public.villages WHERE id = NEW.village_id;
  payload := jsonb_build_object('village_name', v.name, 'title', NEW.title, 'start_time', NEW.start_time);
  FOR host_id IN SELECT public.get_village_host_ids(NEW.village_id) LOOP
    PERFORM public.create_notification(host_id, auth.uid(), 'event.created', 'event', NEW.id::text, 'village', NEW.village_id, payload);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_event_created AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_event_created();

-- scenius
CREATE OR REPLACE FUNCTION public.notify_scenius_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
  host_id uuid;
  contributor_id uuid;
  payload jsonb;
BEGIN
  SELECT id, name INTO v FROM public.villages WHERE id = NEW.village_id;
  payload := jsonb_build_object('village_name', v.name, 'name', NEW.name);

  FOR host_id IN SELECT public.get_village_host_ids(NEW.village_id) LOOP
    PERFORM public.create_notification(host_id, auth.uid(), 'scenius.created', 'scenius', NEW.id::text, 'village', NEW.village_id, payload);
  END LOOP;

  IF NEW.contributors IS NOT NULL THEN
    FOREACH contributor_id IN ARRAY NEW.contributors LOOP
      PERFORM public.create_notification(contributor_id, auth.uid(), 'scenius.contributor_added', 'scenius', NEW.id::text, 'village', NEW.village_id, payload);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_scenius_created AFTER INSERT ON public.scenius
FOR EACH ROW EXECUTE FUNCTION public.notify_scenius_created();

-- scenius contributor added on update
CREATE OR REPLACE FUNCTION public.notify_scenius_contributor_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  contributor_id uuid;
  payload jsonb;
BEGIN
  payload := jsonb_build_object('name', NEW.name);
  IF NEW.contributors IS NOT NULL THEN
    FOREACH contributor_id IN ARRAY NEW.contributors LOOP
      IF OLD.contributors IS NULL OR NOT (contributor_id = ANY(OLD.contributors)) THEN
        PERFORM public.create_notification(contributor_id, auth.uid(), 'scenius.contributor_added', 'scenius', NEW.id::text, 'village', NEW.village_id, payload);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_scenius_contributor_added AFTER UPDATE OF contributors ON public.scenius
FOR EACH ROW EXECUTE FUNCTION public.notify_scenius_contributor_added();

-- bulletin
CREATE OR REPLACE FUNCTION public.notify_bulletin_posted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  host_id uuid;
  payload jsonb;
BEGIN
  payload := jsonb_build_object('author_name', NEW.author_name, 'excerpt', left(NEW.message, 140));
  FOR host_id IN SELECT public.get_village_host_ids(NEW.village_id) LOOP
    PERFORM public.create_notification(host_id, auth.uid(), 'bulletin.posted', 'bulletin', NEW.id::text, 'village', NEW.village_id, payload);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_bulletin_posted AFTER INSERT ON public.bulletin
FOR EACH ROW EXECUTE FUNCTION public.notify_bulletin_posted();

-- proposals
CREATE OR REPLACE FUNCTION public.notify_proposal_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  host_id uuid;
  payload jsonb;
BEGIN
  payload := jsonb_build_object('title', NEW.title, 'author_name', NEW.author_name, 'amount', NEW.amount);
  FOR host_id IN SELECT public.get_village_host_ids(NEW.village_id) LOOP
    PERFORM public.create_notification(host_id, auth.uid(), 'proposal.created', 'proposal', NEW.id::text, 'village', NEW.village_id, payload);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_proposal_created AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_proposal_created();

-- village_hosts (co-host added)
CREATE OR REPLACE FUNCTION public.notify_cohost_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v record;
  payload jsonb;
BEGIN
  SELECT id, name INTO v FROM public.villages WHERE id = NEW.village_id;
  payload := jsonb_build_object('village_name', v.name, 'role', NEW.role);
  PERFORM public.create_notification(NEW.user_id, NEW.invited_by, 'village.host_added', 'village', NEW.village_id, NULL, NULL, payload);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_cohost_added AFTER INSERT ON public.village_hosts
FOR EACH ROW EXECUTE FUNCTION public.notify_cohost_added();

-- user_connections (followed)
CREATE OR REPLACE FUNCTION public.notify_user_followed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.create_notification(NEW.following_id, NEW.follower_id, 'connection.followed', 'profile', NEW.follower_id::text, NULL, NULL, '{}'::jsonb);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_user_followed AFTER INSERT ON public.user_connections
FOR EACH ROW EXECUTE FUNCTION public.notify_user_followed();

-- reveal_requests
CREATE OR REPLACE FUNCTION public.notify_reveal_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(NEW.target_user_id, NEW.requester_id, 'connection.reveal_requested', 'reveal_request', NEW.id::text, NULL, NULL, '{}'::jsonb);
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    PERFORM public.create_notification(NEW.requester_id, NEW.target_user_id, 'connection.reveal_approved', 'reveal_request', NEW.id::text, NULL, NULL, '{}'::jsonb);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_reveal_request_ins AFTER INSERT ON public.reveal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_reveal_request();
CREATE TRIGGER trg_notify_reveal_request_upd AFTER UPDATE ON public.reveal_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_reveal_request();

-- bulletin reactions (notify hosts of village this bulletin belongs to)
CREATE OR REPLACE FUNCTION public.notify_bulletin_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  host_id uuid;
  payload jsonb;
BEGIN
  SELECT id, village_id, author_name, message INTO b FROM public.bulletin WHERE id = NEW.bulletin_id;
  payload := jsonb_build_object('reaction', NEW.reaction_type, 'excerpt', left(b.message, 80));
  FOR host_id IN SELECT public.get_village_host_ids(b.village_id) LOOP
    PERFORM public.create_notification(host_id, auth.uid(), 'bulletin.reaction', 'bulletin', b.id::text, 'village', b.village_id, payload);
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_bulletin_reaction AFTER INSERT ON public.bulletin_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_bulletin_reaction();
