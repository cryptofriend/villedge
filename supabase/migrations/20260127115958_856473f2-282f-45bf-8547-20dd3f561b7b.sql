-- Change default is_anon to true (all new profiles are anonymous by default)
ALTER TABLE public.profiles ALTER COLUMN is_anon SET DEFAULT true;

-- Create user_connections table for mutual follows
CREATE TABLE public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for connections
CREATE POLICY "Anyone can view connections" ON public.user_connections
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.user_connections
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.user_connections
  FOR DELETE USING (auth.uid() = follower_id);

-- Create reveal_requests table for requesting visibility
CREATE TABLE public.reveal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_user_id)
);

-- Enable RLS
ALTER TABLE public.reveal_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for reveal requests
CREATE POLICY "Users can view their own requests" ON public.reveal_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create reveal requests" ON public.reveal_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target users can update request status" ON public.reveal_requests
  FOR UPDATE USING (auth.uid() = target_user_id);

CREATE POLICY "Users can delete their own requests" ON public.reveal_requests
  FOR DELETE USING (auth.uid() = requester_id);

-- Function to check if users have mutual connection
CREATE OR REPLACE FUNCTION public.has_mutual_connection(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections c1
    JOIN public.user_connections c2 
      ON c1.follower_id = c2.following_id 
      AND c1.following_id = c2.follower_id
    WHERE c1.follower_id = _user_a AND c1.following_id = _user_b
  )
$$;

-- Function to check if reveal was approved
CREATE OR REPLACE FUNCTION public.has_approved_reveal(_requester uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reveal_requests
    WHERE requester_id = _requester 
      AND target_user_id = _target 
      AND status = 'approved'
  )
$$;